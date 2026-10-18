import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fixtureServer } from './fixture-server.mjs';
import { base, renderTemplate, products } from './theme-fixture.mjs';
const fixture=await fixtureServer();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[]; const errors=[];
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
await mkdir('test-results',{recursive:true});
async function check(name,fn){try{await fn();results.push({name,status:'passed'});console.log('PASS',name);}catch(error){results.push({name,status:'failed',error:error.stack});console.error('FAIL',name,error.message);}}
const go=route=>page.goto(fixture.url+route,{waitUntil:'networkidle'});
const text=async(selector)=>page.locator(selector).textContent();
try{
 await check('Responsive rendered Liquid templates have no overflow at 320, 390, 768, 1440 and 1920px',async()=>{
  for(const width of [320,390,768,1440,1920]){
   await page.setViewportSize({width,height:900});
   for(const route of ['/','/products/gift-1','/collections/all','/pages/gift-box-builder','/pages/contact','/pages/wishlist','/cart','/search','/404']){
    await go(route);
    const measurement=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert.ok(measurement.scroll<=measurement.viewport+1,`${route} at ${width}: ${JSON.stringify(measurement)}`);
    const broken=await page.locator('img').evaluateAll(async images=>{images.forEach(img=>img.loading='eager');return (await Promise.all(images.filter(img=>img.getAttribute('src')).map(async img=>{try{await img.decode();return null;}catch{return img.src;}}))).filter(Boolean);});
    assert.deepEqual(broken,[],`${route} images`);
   }
  }
 });
 await check('Desktop mega menu opens with keyboard and closes with Escape',async()=>{
  await page.setViewportSize({width:1440,height:1000});await go('/');
  const summary=page.locator('.mega-menu summary').first();await summary.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.mega-menu').first().getAttribute('open'),'');await page.keyboard.press('Escape');assert.equal(await page.locator('.mega-menu').first().getAttribute('open'),null);
 });
 await check('Mobile drawer traps focus, follows navigation, and closes with Escape',async()=>{
  await page.setViewportSize({width:390,height:844});await go('/');await page.locator('[data-open="MenuDrawer"]').click();assert.equal(await page.locator('#MenuDrawer').evaluate(n=>n.open),true);
  for(let i=0;i<18;i++)await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#MenuDrawer')),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#MenuDrawer').evaluate(n=>n.open),false);
 });
 await check('Slideshow buttons, dot navigation, swipe, and reduced motion',async()=>{
  await go('/');await page.locator('hero-slideshow [data-next]').click();assert.equal(await page.locator('[data-slide]:visible h2').textContent(),'Gifts made personal.');
  await page.locator('[data-dot="4"]').click();assert.match(await page.locator('[data-slide]:visible h2').textContent(),/Curated/);
  await page.locator('hero-slideshow').evaluate(n=>{n.dispatchEvent(new PointerEvent('pointerdown',{clientX:200,clientY:200}));n.dispatchEvent(new PointerEvent('pointerup',{clientX:290,clientY:210}));});
  assert.equal(await page.locator('[data-dot="3"]').getAttribute('aria-pressed'),'true');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.hero-slide')).animationName),'none');
  assert.equal(await page.locator('hero-slideshow').evaluate(n=>n.paused),true);await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await check('Featured product carousel moves on mobile and quick view loads the real product form',async()=>{
  await page.setViewportSize({width:390,height:844});await go('/');const track=page.locator('.product-carousel').first();await track.locator('..').locator('[data-next]').click();await page.waitForFunction(()=>document.querySelector('.product-carousel').scrollLeft>0);assert.ok(await track.evaluate(n=>n.scrollLeft)>0);
  await go('/collections/all');await page.locator('[data-quick-view]').first().click();await page.waitForFunction(()=>document.querySelector('#QuickView').open);assert.equal(await page.locator('#QuickView product-form').count(),1);await page.keyboard.press('Escape');
 });
 await check('Variant combination, real price changes, sold-out and unavailable states',async()=>{
  await go('/products/gift-2');await page.locator('.variant-options').first().locator('input[value=Ivory]').check();assert.equal(await text('[data-availability]'),'Sold out');assert.equal(await page.locator('[data-add]').isDisabled(),true);
  await page.locator('.variant-options').nth(1).locator('input[value=Premium]').check();assert.match(await text('[data-product-price]'),/2,200/);assert.equal(await page.locator('[data-add]').isEnabled(),true);
  await page.locator('.variant-options').first().locator('input[value=Navy]').check();assert.match(await text('[data-availability]'),/unavailable/);assert.equal(await page.locator('[data-add]').isDisabled(),true);
 });
 await check('Gift text is required, counted, previewed as text, and preserved in cart updates',async()=>{
  fixture.reset();await go('/products/gift-2');await page.locator('[data-add]').click();assert.equal(fixture.cart().items.length,0);
  const name=page.locator('[data-preview-field="name"]');await name.fill('<img src=x onerror=alert(1)>');await page.locator('[data-preview-field="message"]').fill('Happy birthday, Amina');
  assert.equal(await text('[data-preview-name]'),'<img src=x onerror=alert(1)>');assert.equal(await page.locator('[data-preview-name] img').count(),0);
  assert.match(await page.locator('[data-count-for]').first().textContent(),/28 \/ 60/);
  await page.locator('[data-add]').click();await page.waitForFunction(()=>document.getElementById('CartDrawer').open);
  assert.equal(fixture.cart().items[0].properties['Gift message'],'Happy birthday, Amina');
  const qty=page.locator('#CartDrawer [data-cart-quantity]');await qty.fill('2');await qty.dispatchEvent('change');await page.waitForFunction(()=>document.querySelector('#CartDrawer [data-cart-quantity]')?.value==='2');
  assert.equal(fixture.cart().items[0].quantity,2);assert.equal(fixture.cart().items[0].properties['Gift message'],'Happy birthday, Amina');
  await page.reload({waitUntil:'networkidle'});await page.locator('[data-open="CartDrawer"]').click();await page.waitForFunction(()=>document.querySelector('#CartDrawer .line-properties')?.textContent.includes('Happy birthday'));
  assert.equal(fixture.cart().items[0].quantity,2);
 });
 await check('Add-to-cart inventory error is shown without pretending success',async()=>{
  fixture.reset();fixture.rejectAdd();await go('/products/gift-2');await page.locator('[data-preview-field="name"]').fill('Amina');await page.locator('[data-add]').click();await page.waitForFunction(()=>document.querySelector('[data-form-error]').textContent.length>0);assert.match(await text('[data-form-error]'),/no longer available/);assert.equal(fixture.cart().items.length,0);assert.equal(await page.locator('[data-add]').isEnabled(),true);
 });
 await check('Photo upload validates MIME type and previews a valid photo',async()=>{
  await go('/products/gift-1');await page.locator('[data-upload]').setInputFiles({name:'bad.html',mimeType:'text/html',buffer:Buffer.from('<html>bad</html>')});assert.match(await text('[data-upload-error]'),/JPG/);
  await page.locator('[data-upload]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vN8AAAAASUVORK5CYII=','base64')});assert.equal(await text('[data-upload-error]'),'');assert.equal(await page.locator('[data-upload-preview]').isVisible(),true);
  assert.equal(await page.locator('product-form form').getAttribute('enctype'),'multipart/form-data');
 });
 await check('Product gallery switches thumbnails and opens a fullscreen dialog',async()=>{
  await go('/products/gift-1');await page.locator('[data-thumbnail]').nth(1).click();assert.equal(await page.locator('[data-media-id="101"]').isVisible(),true);await page.locator('[data-media-id="101"] [data-zoom]').click();assert.equal(await page.locator('.image-modal').evaluate(n=>n.open),true);await page.keyboard.press('Escape');
 });
 await check('Predictive search requests Shopify endpoint and supports keyboard result navigation',async()=>{
  await go('/');await page.locator('[data-open="SearchDrawer"]').click();await page.locator('#SearchInput').fill('gift');await page.waitForSelector('#PredictiveResults .predictive-item');await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.id==='SearchInput' && document.activeElement.getAttribute('aria-activedescendant')==='SearchSuggestion-0'),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#SearchInput').getAttribute('aria-expanded'),'false');
 });
 await check('Wishlist survives page reload and supports removal and empty state',async()=>{
  await go('/products/gift-2');await page.locator('[data-wishlist="gift-2"]').click();await go('/pages/wishlist');await page.waitForSelector('.wishlist-item');assert.match(await text('#MainContent wishlist-list'),/A Personal Keepsake/);await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#MainContent .wishlist-item').count(),1);await page.locator('#MainContent wishlist-list [data-wishlist]').click();assert.match(await text('#MainContent wishlist-list'),/Tap the heart/);
 });
 await check('Gift-box builder enforces steps, persists selections, computes actual prices, and submits real variant IDs',async()=>{
  fixture.reset();await go('/pages/gift-box-builder');await page.locator('[data-builder-next]').click();assert.match(await text('[data-builder-error]'),/Choose/);
  await page.locator('[data-box-options] input').first().check();await page.locator('[data-builder-next]').click();await page.locator('[data-item-options] input[type=number]').nth(1).fill('2');await page.locator('[data-item-options] input[type=number]').nth(1).dispatchEvent('change');assert.match(await text('[data-builder-total]'),/7,100/);
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-item-options] input[type=number]').nth(1).inputValue(),'2');await page.locator('[data-builder-next]').click();await page.locator('[data-builder-next]').click();
  await page.locator('[data-wrapping-options] input').nth(1).check();await page.locator('[data-builder-next]').click();await page.locator('[data-card-options] input').nth(1).check();await page.locator('[data-builder-next]').click();
  await page.locator('[data-builder-name]').fill('Amina');await page.locator('[data-builder-message]').fill('A box of joy');await page.locator('[data-builder-next]').click();assert.match(await text('[data-builder-review]'),/A box of joy/);
  await page.locator('[data-builder-add]').click();await page.waitForFunction(()=>document.getElementById('CartDrawer').open);
  const lines=fixture.cart().items;assert.equal(lines.length,4);assert.equal(new Set(lines.map(i=>i.properties['_gift_box_id'])).size,1);assert.equal(lines[0].properties['Gift message'],'A box of joy');
  assert.ok(fixture.events.some(e=>e.path==='/cart/add.js'&&e.body.items.length===4));
 });
 await check('Cart removal and checkout handoff save order note and customization',async()=>{
  await page.locator('#CartDrawer [data-cart-remove]').last().click();await page.waitForFunction(()=>document.querySelectorAll('#CartDrawer .cart-line').length===3);assert.equal(fixture.cart().items.length,3);
  await page.locator('#CartDrawer [name=note]').fill('Deliver with care');await page.locator('#CartDrawer [name=checkout]').click();await page.waitForURL(fixture.url+'/cart');
  assert.equal(fixture.cart().note,'Deliver with care');assert.ok(fixture.events.some(e=>e.path==='/cart'&&e.body.checkout));assert.equal(fixture.cart().items[0].properties['Gift message'],'A box of joy');
 });
 await check('Sorting submits native Shopify query parameters; contact and newsletter use native form validation',async()=>{
  await go('/collections/all');await page.locator('.filter-toggle').click();await page.locator('select[name=sort_by]').selectOption('price-ascending');await page.locator('.collection-filters [type=submit]').click();assert.match(page.url(),/sort_by=price-ascending/);
  await go('/pages/contact');assert.equal(await page.locator('#ContactEmail').getAttribute('type'),'email');await page.locator('#ContactEmail').fill('invalid');assert.equal(await page.locator('#ContactEmail').evaluate(n=>n.checkValidity()),false);assert.equal(await page.locator('#ContactMessage').getAttribute('required'),'');
  await go('/');assert.equal(await page.locator('.newsletter-section input[name="contact[accepts_marketing]"]').inputValue(),'true');assert.equal(await page.locator('.newsletter-section input[type=email]').getAttribute('required'),'');
 });
 await check('Category expansion and occasion carousel keep every destination accessible',async()=>{
  await go('/');
  // The fixture renderer omits Shopify section wrappers, so locate by its unique details.
  const more=page.locator('.catalog-more').first();assert.equal(await more.locator('.collection-card').first().isVisible(),false);
  await more.locator('summary').click();assert.equal(await more.locator('.collection-card').count(),4);assert.equal(await more.locator('.collection-card').first().isVisible(),true);
  const rail=page.locator('.collection-rail');assert.equal(await rail.locator('.collection-card').count(),11);
  await rail.locator('..').locator('[data-next]').click();await page.waitForFunction(()=>document.querySelector('.collection-rail').scrollLeft>0);
 });
 await check('Collection cards keep portrait media and visible, aligned purchase actions',async()=>{
  await go('/collections/all');
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   const cards=await page.locator('.product-grid .product-card').evaluateAll(nodes=>nodes.map(node=>{
    const image=node.querySelector('.product-card-media').getBoundingClientRect(),info=node.querySelector('.product-card-info').getBoundingClientRect(),action=node.querySelector('.card-actions').getBoundingClientRect();
    return {ratio:image.width/image.height,infoBottom:info.bottom,actionTop:action.top,actionHeight:action.height};
   }));
   assert.ok(cards.every(card=>Math.abs(card.ratio-.8)<.01&&card.actionTop>=card.infoBottom-1&&card.actionHeight>=44));
   assert.ok(Math.abs(cards[0].actionTop-cards[1].actionTop)<1,'same-row buttons align');
  }
 });
 await check('Filter panels adapt to mobile and desktop without shifting the desktop grid',async()=>{
  await go('/collections/all');assert.equal(await page.locator('[data-catalog-filters]').evaluate(n=>n.open),true);
  const before=await page.locator('.product-grid').boundingBox();await page.locator('.filter-group summary').first().click();const after=await page.locator('.product-grid').boundingBox();assert.equal(before.x,after.x);assert.equal(before.width,after.width);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>!document.querySelector('[data-catalog-filters]').open);assert.equal(await page.locator('[data-catalog-filters]').evaluate(n=>n.open),false);
  await page.locator('.filter-toggle').click();assert.equal(await page.locator('select[name=sort_by]').isVisible(),true);
  await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>document.querySelector('[data-catalog-filters]').open);assert.equal(await page.locator('[data-catalog-filters]').evaluate(n=>n.open),true);
 });
 await check('Card quick add submits real variant minimum quantity and shows server errors',async()=>{
  fixture.reset();await go('/collections/all');await page.locator('[data-quick-add]').click();await page.waitForFunction(()=>document.querySelector('#CartDrawer').open);
  assert.equal(fixture.cart().items[0].variant.id,50);assert.equal(fixture.cart().items[0].quantity,2);await page.keyboard.press('Escape');
  fixture.reset();fixture.rejectAdd();await page.locator('[data-quick-add]').click();await page.waitForFunction(()=>document.querySelector('[data-quick-add]').closest('.product-card').querySelector('[data-card-error]').textContent.length>0);
  assert.equal(fixture.cart().items.length,0);assert.match(await page.locator('[data-quick-add]').locator('..').locator('[data-card-error]').textContent(),/no longer available/);assert.equal(await page.locator('[data-quick-add]').isEnabled(),true);
 });
 await check('Search results render product cards with functional product links',async()=>{
  await go('/search');assert.equal(await page.locator('.product-grid .product-card').count(),5);assert.equal(await page.locator('.product-card h3 a').first().getAttribute('href'),'/products/gift-1');
 });
 await page.setViewportSize({width:1440,height:1000});await go('/');await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});
 await check('Mobile purchase bar validates personalization and follows variant price and stock',async()=>{
  fixture.reset();await page.setViewportSize({width:390,height:844});await go('/products/gift-2');
  const bar=page.locator('[data-mobile-purchase]');await page.waitForFunction(()=>!document.querySelector('[data-mobile-purchase]').hidden);
  assert.equal(await bar.isVisible(),true);assert.match(await bar.locator('[data-mobile-price]').textContent(),/1,800/);
  await bar.locator('[data-mobile-add]').click();assert.equal(fixture.cart().items.length,0);assert.equal(await page.locator('[data-preview-field="name"]').evaluate(n=>n.matches(':invalid')),true);
  await page.locator('.variant-options').first().locator('input[value=Ivory]').check();assert.equal(await bar.locator('[data-mobile-add]').isDisabled(),true);
  await page.locator('.variant-options').nth(1).locator('input[value=Premium]').check();assert.match(await bar.locator('[data-mobile-price]').textContent(),/2,200/);
  await page.locator('[data-preview-field="name"]').fill('Amina');await page.locator('[data-preview-field="message"]').fill('With love');
  await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>!document.querySelector('[data-mobile-purchase]').hidden);await bar.locator('[data-mobile-add]').click();await page.waitForFunction(()=>document.querySelector('#CartDrawer').open);
  assert.equal(fixture.cart().items[0].variant.id,21);assert.equal(fixture.cart().items[0].properties['Gift message'],'With love');await page.keyboard.press('Escape');
  await page.setViewportSize({width:1440,height:1000});assert.equal(await bar.isVisible(),false);
 });
 await check('Compact header and clean cards keep usable controls on phones and tablets',async()=>{
  await go('/');for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:900});
   assert.ok((await page.locator('.site-header').boundingBox()).height<=84);
   assert.equal(await page.locator('[data-open="MenuDrawer"]').isVisible(),width<1120);
   const card=page.locator('.product-carousel .product-card').first();assert.equal(await card.locator('.wishlist-button').isVisible(),true);
   const actions=await card.locator('.card-actions .button,.card-quick-view').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect()));assert.ok(actions.every(a=>a.height>=44));
   assert.equal(await card.locator('.card-category').count(),0);
  }
 });
 await check('Theme editor font, palette and product image settings override stylesheet defaults',async()=>{
  const preview='/qa-editor-settings';
  const html=await renderTemplate('search',{search:{performed:true,terms:'gift',results:products,results_count:products.length,filters:[],sort_options:[],default_sort_by:'manual'},settings:{...base.settings,use_shopify_fonts:true,color_navy:'#123456',card_ratio:'1 / 1',card_image_fit:'contain',show_product_type:true,body_font:{family:'Verdana',fallback_families:'sans-serif',system:true}}});
  await page.route(fixture.url+preview,route=>route.fulfill({status:200,contentType:'text/html',body:html}));
  await go(preview);
  const styles=await page.evaluate(()=>{const media=document.querySelector('.product-card-media').getBoundingClientRect();return {ratio:media.width/media.height,fit:getComputedStyle(document.querySelector('.product-primary')).objectFit,font:getComputedStyle(document.body).fontFamily,navy:getComputedStyle(document.documentElement).getPropertyValue('--navy').trim()};});
  assert.ok(Math.abs(styles.ratio-1)<.01);assert.equal(styles.fit,'contain');assert.match(styles.font,/Verdana/);assert.equal(styles.navy,'#123456');assert.equal(await page.locator('.card-category').count(),5);
  await page.unroute(fixture.url+preview);
 });
 await check('Missing or invalid imported settings retain the photographed design and visible primary CTA',async()=>{
  for(const [key,settings] of [['missing',{}],['empty',{color_navy:'',color_beige:'',color_ivory:'',color_text:'',heading_font:'',body_font:''}],['invalid-font',{use_shopify_fonts:true,heading_font:'not-a-font',body_font:'not-a-font'}]]){
   const routeName=`/qa-import-${key}`;const html=await renderTemplate('index',{settings});
   assert.doesNotMatch(html,/Liquid error|font_url can only/);assert.doesNotMatch(html,/rel="preload"[^>]*qa-selected-font/);
   await page.route(fixture.url+routeName,route=>route.fulfill({status:200,contentType:'text/html',body:html}));
   await go(routeName);
   const actual=await page.evaluate(()=>{
    const hero=document.querySelector('.hero'),cta=document.querySelector('.hero-buttons .button'),body=getComputedStyle(document.body);
    const media=document.querySelector('.product-card-media').getBoundingClientRect();
    return {hero:getComputedStyle(hero).backgroundColor,ctaBackground:getComputedStyle(cta).backgroundColor,ctaText:getComputedStyle(cta).color,bodyFont:body.fontFamily,headingFont:getComputedStyle(document.querySelector('h1')).fontFamily,ratio:media.width/media.height,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.equal(actual.hero,'rgb(241, 235, 225)');assert.equal(actual.ctaBackground,'rgb(16, 27, 45)');assert.equal(actual.ctaText,'rgb(255, 255, 255)');assert.match(actual.bodyFont,/Arial/);assert.match(actual.headingFont,/Georgia/);assert.ok(Math.abs(actual.ratio-.8)<.01);assert.equal(actual.overflow,false);
   assert.equal(await page.locator('.hero-buttons .button').first().isVisible(),true);
   await page.unroute(fixture.url+routeName);
  }
 });
 await check('No browser JavaScript errors during tested flows',async()=>assert.deepEqual(errors,[]));
}finally{
 await writeFile('test-results/browser-results.json',JSON.stringify({environment:'Local Liquid fixture renderer with mocked Shopify APIs. Not a live Shopify store.',results},null,2));
 await browser.close();await new Promise(resolve=>fixture.server.close(resolve));
}
if(results.some(result=>result.status==='failed'))process.exitCode=1;
console.log(`${results.filter(r=>r.status==='passed').length}/${results.length} browser checks passed; Shopify APIs were mocked.`);
