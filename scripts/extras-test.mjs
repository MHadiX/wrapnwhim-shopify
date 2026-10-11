import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import {fixtureServer} from './fixture-server.mjs';
import {products} from './theme-fixture.mjs';
const f=await fixtureServer();const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const context=await b.newContext();const page=await context.newPage();let count=0;
const go=()=>page.goto(f.url+'/products/gift-3',{waitUntil:'networkidle'});
async function check(name,fn){await fn();console.log('PASS',name);count++;}
const cards=()=>page.locator('[data-extra-card]');
const submit=async()=>{await page.locator('[data-add]').click();await page.waitForFunction(()=>!document.querySelector('product-form').busy);};
try{
await check('Extras use real variant data, default unchecked, updated quantities and main variants',async()=>{
 await go();assert.equal(await page.locator('[data-extra-select]:checked').count(),0);assert.equal(await cards().count(),2);
 await cards().first().locator('[data-extra-select]').check();await cards().first().locator('[data-extra-quantity]').fill('2');
 assert.match(await page.locator('[data-gift-total]').textContent(),/7,800/);
 await page.locator('.variant-options').first().locator('[value=Ivory]').check();assert.equal(await page.locator('[data-add]').isDisabled(),true);
 await page.locator('.variant-options').nth(1).locator('[value=Premium]').check();assert.match(await page.locator('[data-gift-total]').textContent(),/8,200/);
 await cards().first().locator('[data-extra-variant]').selectOption('41');assert.match(await page.locator('[data-gift-total]').textContent(),/9,000/);
 assert.equal(await cards().first().locator('option[value="42"]').isDisabled(),true);
});
await check('Main quantity and gift-message counter update; browser back recalculates restored state',async()=>{
 await go();await page.locator('[name=quantity]').fill('2');assert.match(await page.locator('[data-base-total]').textContent(),/4,400/);
 const message=page.locator('[name="properties[Gift message]"]');await message.fill('Hello');assert.match(await page.locator('[data-count-for$="gift-message"]').textContent(),/5 \/ 250/);assert.equal(await message.getAttribute('maxlength'),'250');
 await page.goto(f.url+'/collections/all');await page.goBack({waitUntil:'networkidle'});assert.equal(await page.locator('[data-gift-total]').count(),1);assert.match(await page.locator('[data-gift-total]').textContent(),/PKR/);
});
await check('Main and selected extras are separate actual lines with one shared group and safe message',async()=>{
 f.reset();await go();await cards().first().locator('[data-extra-select]').check();await cards().nth(1).locator('[data-extra-select]').check();
 await page.locator('[name="properties[Gift message]"]').fill('<script>alert(1)</script> Happy birthday');await submit();
 assert.equal(f.cart().items.length,3);const parent=f.cart().items[0];assert.equal(parent.properties._wnw_role,'parent');assert.ok(f.cart().items.every(i=>i.properties._wnw_group===parent.properties._wnw_group));
 assert.equal(f.cart().items[2].quantity,2);assert.equal(await page.locator('#CartDrawer .cart-gift-group').count(),1);assert.equal(await page.locator('#CartDrawer .cart-gift-extras .cart-line').count(),2);assert.match(await page.locator('#CartDrawer').textContent(),/<script>alert/);assert.equal(await page.locator('#CartDrawer script').count(),0);
});
await check('Extra removal preserves parent; parent removal removes remaining group',async()=>{
 const key=f.cart().items[1].key;await page.locator('#CartDrawer [data-cart-remove]').filter({hasText:'Remove'}).nth(1).click();await page.waitForFunction(()=>document.querySelectorAll('#CartDrawer .cart-line').length===2);assert.ok(!f.cart().items.some(i=>i.key===key));
 await page.locator('#CartDrawer [data-cart-remove]').first().click();await page.waitForFunction(()=>document.querySelector('#CartDrawer .empty-cart'));assert.equal(f.cart().items.length,0);
});
await check('Identical variants with different messages receive separate groups; reload shows grouped lines',async()=>{
 for(const message of ['First','Second']){await go();await page.locator('[name="properties[Gift message]"]').fill(message);await submit();}
 assert.equal(f.cart().items.length,2);assert.notEqual(f.cart().items[0].properties._wnw_group,f.cart().items[1].properties._wnw_group);await page.goto(f.url+'/cart');assert.equal(await page.locator('main .cart-gift-group').count(),2);
});
await check('Shopify errors do not show success and partial additions are rolled back',async()=>{
 f.reset();await go();await cards().first().locator('[data-extra-select]').check();f.partialAdd();await submit();assert.equal(f.cart().items.length,0);assert.match(await page.locator('[data-form-error]').textContent(),/not added/);assert.equal(await page.locator('#CartDrawer').evaluate(n=>n.open),false);
 f.rejectAdd();await submit();assert.match(await page.locator('[data-form-error]').textContent(),/no longer available/);
});
await check('Changed prices require review; stock changes block submission',async()=>{
 await go();await cards().first().locator('[data-extra-select]').check();const v=products[3].variants[0];const price=v.price;v.price+=100;await submit();assert.match(await page.locator('[data-form-error]').textContent(),/price changed/);assert.equal(f.cart().items.length,0);v.price=price;
 await go();await cards().first().locator('[data-extra-select]').check();v.available=false;await submit();assert.match(await page.locator('[data-form-error]').textContent(),/no longer available/);assert.equal(f.cart().items.length,0);v.available=true;
});
await check('Quantity limits and duplicate clicks are enforced; no-extras gifts work',async()=>{
 await go();await cards().first().locator('[data-extra-select]').check();await cards().first().locator('[data-extra-quantity]').fill('99');await page.locator('[data-add]').click();assert.equal(f.cart().items.length,0);
 await go();await page.locator('[data-add]').evaluate(button=>{button.click();button.click();});await page.waitForFunction(()=>document.querySelector('#CartDrawer').open);assert.equal(f.cart().items.length,1);
});
await check('Ambiguous add response is reconciled against actual cart; failed cleanup is clearly reported',async()=>{
 f.reset();await go();f.loseResponse();await submit();assert.equal(f.cart().items.length,1);assert.equal(await page.locator('#CartDrawer').evaluate(n=>n.open),true);
 f.reset();await go();await cards().first().locator('[data-extra-select]').check();f.partialAdd();f.failCleanup();await submit();assert.equal(f.cart().items.length,1);assert.match(await page.locator('[data-form-error]').textContent(),/Only part/);
});
await check('Discounted cart totals use final line prices and extras are not double-counted',async()=>{
 f.reset();await go();await cards().first().locator('[data-extra-select]').check();await submit();f.discount();await page.goto(f.url+'/cart');
 assert.match(await page.locator('main .cart-bundle-total').textContent(),/4,998/);assert.match(await page.locator('main .subtotal').textContent(),/4,998/);assert.match(await page.locator('main .discount').first().textContent(),/Fixture automatic discount/);
 // Simulate external/native parent removal: the theme must expose the orphan rather than hide its price.
 const parent=f.cart().items[0];await page.request.post(f.url+'/cart/change.js',{data:{id:parent.key,quantity:0}});await page.reload();assert.match(await page.locator('main').textContent(),/no main gift/);assert.equal(await page.locator('main .cart-line').count(),1);
});
await check('Slow catalog request prevents duplicate submissions and leaves form usable afterward',async()=>{
 f.reset();await go();await page.route('**/products/gift-3.js',async route=>{await new Promise(r=>setTimeout(r,300));await route.continue();});
 await page.locator('[data-add]').evaluate(button=>{button.click();button.click();});await page.waitForFunction(()=>document.querySelector('#CartDrawer').open);assert.equal(f.cart().items.length,1);assert.equal(await page.locator('product-form form').evaluate(n=>n.inert),false);await page.unroute('**/products/gift-3.js');
});
await check('Responsive extras and WCAG checks at 320,390,768,1440px',async()=>{
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await go();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();assert.deepEqual(result.violations.map(v=>v.id),[]);
});
console.log(`${count} extras checks passed (mock Shopify APIs; live store test still required).`);
}finally{await b.close();await new Promise(r=>f.server.close(r));}
