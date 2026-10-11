/* Local QA renderer. Fixture catalog/API responses are test doubles, never production storefront data. */
import { Liquid } from 'liquidjs';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const themeRoot = process.cwd();
const engine = new Liquid({root:themeRoot,partials:path.join(themeRoot,'snippets'),extname:'.liquid',strictFilters:false});
function renderLiquid(source,scope){return engine.parseAndRender(source,scope,{globals:scope});}
engine.registerFilter('asset_url',name=>`/assets/${name}`);
engine.registerFilter('stylesheet_tag',url=>`<link rel="stylesheet" href="${url}">`);
engine.registerFilter('money_with_currency',value=>`PKR ${(value/100).toLocaleString('en-PK')}`);
engine.registerFilter('json',value=>JSON.stringify(value ?? null));
engine.registerFilter('image_url',(image,...args)=> image?.src || '/assets/giftbox.webp');
engine.registerFilter('image_tag',(url,...args)=>{const attrs = Object.fromEntries(args.filter(Array.isArray)); return `<img src="${url}" alt="${attrs.alt||'Fixture gift'}" width="512" height="512" loading="${attrs.loading||'lazy'}" class="${attrs.class||''}">`;});
function requireFont(font, filter) {
 if (!font || typeof font!=='object' || !font.family) throw new TypeError(`${filter} can only be used with a font drop`);
 return font;
}
engine.registerFilter('font_face',font=>{requireFont(font,'font_face');return '';});
engine.registerFilter('font_url',font=>{requireFont(font,'font_url');return '/qa-selected-font.woff2';});
engine.registerFilter('preload_tag',url=>`<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin="anonymous">`);
engine.registerFilter('structured_data',product=>JSON.stringify({'@context':'https://schema.org','@type':'Product',name:product.title}));
engine.registerFilter('placeholder_svg_tag',()=> '<svg viewBox="0 0 300 300" class="placeholder" aria-hidden="true"></svg>');
engine.registerFilter('default_errors',errors=>errors ? '<p>Please check your information.</p>' : '');
engine.registerFilter('metafield_tag',value=>`<p>${value.value || value}</p>`);
function blockTag(name, render) {
 engine.registerTag(name,{
  parse(token,remain){this.args=token.args;this.templates=[];const stream=this.liquid.parser.parseStream(remain);stream.on(`tag:end${name}`,()=>stream.stop()).on('template',template=>this.templates.push(template)).start();},
  *render(ctx,emitter){const body=yield this.liquid.renderer.renderTemplates(this.templates,ctx);emitter.write(render(this.args,body));}
 });
}
blockTag('schema',()=> '');blockTag('style',(_,body)=>`<style>${body}</style>`);
blockTag('form',(args,body)=>{
 const id=args.match(/id:\s*form_id/)? null : args.match(/id:\s*'([^']+)'/)?.[1];
 let action='/contact';if(args.startsWith("'product'"))action='/cart/add';if(args.startsWith("'storefront_password'"))action='/password';
 return `<form action="${action}" method="post" ${id?`id="${id}"`:''} ${args.includes('multipart')?'enctype="multipart/form-data"':''}>${body}</form>`;
});
blockTag('paginate',(_,body)=>body);
engine.registerTag('sections',{parse(token){this.group=token.args.replace(/['"]/g,'');},*render(ctx,emitter){emitter.write(yield renderGroup(this.group,ctx.getAll()));}});
function img(name) {return {src:`/assets/${name}.webp`,width:512,height:512,alt:`Fixture ${name}`};}
export function fixtureProduct(id=1,title='The Thoughtful Gift',asset='giftbox',price=350000){
 const media={id:id*100,media_type:'image',alt:title,preview_image:img(asset),...img(asset)};
 const variants=[{id:id*10,title:'Navy / Standard',options:['Navy','Standard'],price,compare_at_price:price+50000,available:true,sku:`QA-${id}-N`,quantity_rule:{min:1,increment:1,max:8},featured_media:media},{id:id*10+1,title:'Ivory / Premium',options:['Ivory','Premium'],price:price+40000,compare_at_price:null,available:true,sku:`QA-${id}-I`,quantity_rule:{min:1,increment:1,max:8},featured_media:{id:id*100+1}},{id:id*10+2,title:'Ivory / Standard',options:['Ivory','Standard'],price,available:false,quantity_rule:{min:1,increment:1,max:8}}];
 return {object_type:'product',id,title,handle:`gift-${id}`,url:`/products/gift-${id}`,vendor:'WrapnWhim',type:'Thoughtful gifts',price,compare_at_price:price+50000,price_varies:true,available:true,featured_image:img(asset),images:[img(asset),img('wedding')],media:[media,{id:id*100+1,media_type:'image',...img('wedding')}],description:'<p>A fixture product used exclusively for local storefront tests.</p>',variants,options:['Color','Wrapping'],options_with_values:[{name:'Color',position:1,values:['Navy','Ivory'],selected_value:'Navy'},{name:'Wrapping',position:2,values:['Standard','Premium'],selected_value:'Standard'}],selected_or_first_available_variant:variants[0],has_only_default_variant:false,metafields:{custom:{}},template_suffix:''};
}
export const products=[fixtureProduct(1,'The Thoughtful Gift','giftbox'),fixtureProduct(2,'A Personal Keepsake','personal',180000),fixtureProduct(3,'A Little Sweetness','chocolates',220000),fixtureProduct(4,'A Moment of Calm','lifestyle',280000)];
const simpleGift=fixtureProduct(5,'A beautifully wrapped little luxury for someone special','lifestyle',120000);
simpleGift.variants=[{...simpleGift.variants[0],title:'Default Title',options:['Default Title'],quantity_rule:{min:2,increment:1,max:8}}];
simpleGift.selected_or_first_available_variant=simpleGift.variants[0];
simpleGift.has_only_default_variant=true; simpleGift.price_varies=false; simpleGift.options=['Title']; simpleGift.options_with_values=[];
products.push(simpleGift);
const menu={links:[{title:'Home',url:'/'},{title:'Shop',url:'/collections/all',links:[{title:'All gifts',url:'/collections/all',links:[]},{title:'Personalized gifts',url:'/pages/personalized',links:[]},{title:'Gift boxes',url:'/pages/gift-box-builder',links:[]}]},{title:'Categories',url:'/collections'},{title:'Occasions',url:'/collections'},{title:'About us',url:'/pages/about'},{title:'Contact',url:'/pages/contact'}]};
const collection={title:'Gifts, thoughtfully chosen.',url:'/collections/all',description:'<p>Little luxuries for the moments that matter.</p>',products,products_count:products.length,filters:[{type:'list',label:'Availability',values:[{param_name:'filter.v.availability',value:'1',label:'In stock',count:5,active:false},{param_name:'filter.v.availability',value:'0',label:'Out of stock',count:0,active:false}],active_values:[]},{type:'price_range',label:'Price',range_max:1000000,min_value:{param_name:'filter.v.price.gte'},max_value:{param_name:'filter.v.price.lte'}}],sort_options:[{value:'manual',name:'Featured'},{value:'price-ascending',name:'Price, low to high'},{value:'price-descending',name:'Price, high to low'}],default_sort_by:'manual',image:img('giftbox'),featured_image:img('giftbox')};
export const base={shop:{name:'WrapnWhim',currency:'PKR',description:'Thoughtful gifting.',customer_accounts_enabled:true,enabled_payment_types:[],policies:[]},routes:{root_url:'/',cart_url:'/cart',all_products_collection_url:'/collections/all',collections_url:'/collections',search_url:'/search',account_url:'/account',product_recommendations_url:'/recommendations/products'},settings:{...JSON.parse(await readFile('config/settings_data.json','utf8')).current,heading_font:{family:'Georgia',fallback_families:'serif',system:true},body_font:{family:'Arial',fallback_families:'sans-serif',system:true},delivery_message:'Delivery options are confirmed at checkout.',cod_message:'Payment options are shown at checkout.'},request:{locale:{iso_code:'en'},page_type:'index',design_mode:false},cart:{'empty?':true,empty:true,item_count:0,items:[],currency:{iso_code:'PKR'},total_price:0},canonical_url:'https://example.test/',page_title:'WrapnWhim',content_for_header:'',current_page:1,form:{},paginate:{pages:1},collections:[collection]};
function defaults(schema,config,id){
 const settings=Object.fromEntries((schema.settings||[]).filter(s=>s.default!==undefined).map(s=>[s.id,s.default]));
 Object.assign(settings,config.settings);
 for(const s of schema.settings||[]){if(s.type==='link_list')settings[s.id]=menu;if(s.type==='collection' && settings[s.id])settings[s.id]=collection;if(s.type==='product' && typeof settings[s.id]==='string')settings[s.id]=products.find(p=>p.handle===settings[s.id]);}
 const blocks=(config.block_order||[]).map(bid=>{const block=config.blocks[bid];const def=schema.blocks?.find(b=>b.type===block.type);return {id:bid,type:block.type,settings:{...Object.fromEntries((def?.settings||[]).filter(s=>s.default!==undefined).map(s=>[s.id,s.default])),...block.settings},shopify_attributes:''};});
 return {id,settings,blocks};
}
export async function renderSection(type, config={}, context=base,id=type){
 const source=await readFile(`sections/${type}.liquid`,'utf8');const schema=JSON.parse(source.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
 return renderLiquid(source,{...context,section:defaults(schema,config,id)});
}
async function renderGroup(group,context){const data=JSON.parse(await readFile(`sections/${group}.json`,'utf8'));return (await Promise.all(data.order.map(id=>renderSection(data.sections[id].type,data.sections[id],context,id)))).join('');}
export async function renderTemplate(name,overrides={}){
 const context={...base,...overrides};const data=JSON.parse(await readFile(`templates/${name}.json`,'utf8'));
 if(name==='index')for(const config of Object.values(data.sections))if(config.type==='featured-products')config.settings.collection='fixture';
 const html=(await Promise.all(data.order.map(id=>renderSection(data.sections[id].type,data.sections[id],context,id)))).join('');
 if(data.layout===false)return html;
 return renderLiquid(await readFile(`layout/${data.layout||'theme'}.liquid`,'utf8'),{...context,content_for_layout:html});
}
export async function pages(){
 const product=structuredClone(products[0]);product.metafields.custom={personalization_enabled:{value:true},photo_upload_enabled:{value:true}};
 const builderConfig={settings:{box_product:products[0],items_collection:collection,card_product:products[3]},blocks:{wrap:{type:'wrapping',settings:{product:products[2]}}},block_order:['wrap']};
 const builder=await renderSection('gift-box-builder',builderConfig,base);
 const frame=await renderLiquid(await readFile('layout/theme.liquid','utf8'),{...base,content_for_layout:builder});
 return {'/':await renderTemplate('index'),'/products/gift-1':await renderTemplate('product',{product,request:{...base.request,page_type:'product'}}),'/collections/all':await renderTemplate('collection',{collection}),'/pages/gift-box-builder':frame,'/pages/contact':await renderTemplate('page.contact',{page:{title:'Let’s make it thoughtful.',content:''}}),'/pages/wishlist':await renderTemplate('page.wishlist'),'/cart':await renderTemplate('cart'),'/search':await renderTemplate('search',{search:{performed:true,terms:'gift',results:products,results_count:products.length,filters:collection.filters,sort_options:collection.sort_options,default_sort_by:'manual'}}),'/404':await renderTemplate('404')};
}
