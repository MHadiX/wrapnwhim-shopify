import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pages, base, products, renderSection, renderTemplate } from './theme-fixture.mjs';
export async function fixtureServer() {
 const htmlPages = await pages(); const events=[];
 let items=[],note='',rejectNextAdd=false;
 const cart=()=>({'empty?':items.length===0,empty:items.length===0,items,item_count:items.reduce((n,i)=>n+i.quantity,0),total_price:items.reduce((n,i)=>n+i.final_line_price,0),currency:{iso_code:'PKR'},note,cart_level_discount_applications:[]});
 const cartHtml=()=>renderSection('cart-drawer',{}, {...base,cart:cart()});
 const server=http.createServer(async (req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   const pathname=url.pathname;
   const send=(data,status=200,type='application/json')=>{res.writeHead(status,{'Content-Type':type});res.end(type==='application/json'?JSON.stringify(data):data);};
   let body;
   if(req.method==='POST'){
    const chunks=[];for await (const chunk of req)chunks.push(chunk);const bytes=Buffer.concat(chunks);
    if(req.headers['content-type']?.includes('application/json'))body=JSON.parse(bytes.toString());
    else {const request=new Request(url,{method:'POST',headers:{'Content-Type':req.headers['content-type']||'application/x-www-form-urlencoded'},body:bytes});const form=await request.formData();body=Object.fromEntries(form);}
    events.push({path:pathname,body});
   }
   if(pathname.startsWith('/assets/')){
    const filename=path.resolve('.'+pathname);if(!filename.startsWith(path.resolve('assets')+path.sep))return send({},403);
    return send(await readFile(filename),200,filename.endsWith('.css')?'text/css':filename.endsWith('.js')?'application/javascript':'image/webp');
   }
   if(pathname==='/cart.js')return send(cart());
   if(pathname==='/'&&url.searchParams.has('sections'))return send({'cart-drawer':await cartHtml()});
   if(pathname==='/cart/add.js'){
    if(rejectNextAdd){rejectNextAdd=false;return send({description:'This gift is no longer available.'},422);}
    const lines=body.items||[{id:Number(body.id),quantity:Number(body.quantity),properties:Object.fromEntries(Object.entries(body).filter(([key])=>key.startsWith('properties[')).map(([key,value])=>[key.slice(11,-1),value]))}];
    for(const line of lines){const product=products.find(p=>p.variants.some(v=>v.id===Number(line.id)));const variant=product?.variants.find(v=>v.id===Number(line.id));if(!variant?.available)return send({description:'Sold out'},422);}
    for(const line of lines){const product=products.find(p=>p.variants.some(v=>v.id===Number(line.id)));const variant=product.variants.find(v=>v.id===Number(line.id));const key=`${variant.id}:${items.length}`;items.push({key,product,variant,title:product.title,url:product.url,image:product.featured_image,properties:line.properties||{},quantity:line.quantity,final_price:variant.price,original_line_price:variant.price*line.quantity,final_line_price:variant.price*line.quantity,line_level_discount_allocations:[],url_to_remove:`/cart/change?id=${key}&quantity=0`});}
    return send({...cart(),sections:{'cart-drawer':await cartHtml()}});
   }
   if(pathname==='/cart/change.js'){
    const item=items.find(i=>i.key===body.id);if(!item)return send({description:'Cart line unavailable'},422);
    item.quantity=body.quantity;item.final_line_price=item.final_price*item.quantity;item.original_line_price=item.final_line_price;items=items.filter(i=>i.quantity>0);
    return send({...cart(),sections:{'cart-drawer':await cartHtml()}});
   }
   if(pathname==='/cart/update.js'){
    if(body.note!==undefined)note=body.note;
    for(const [key,qty]of Object.entries(body.updates||{})){const item=items.find(i=>i.key===key);if(item){item.quantity=qty;item.final_line_price=item.final_price*qty;item.original_line_price=item.final_line_price;}}
    items=items.filter(i=>i.quantity>0);return send(cart());
   }
   if(pathname.startsWith('/products/')&&pathname.endsWith('.js')){
    const product=products.find(p=>p.handle===pathname.split('/').pop().slice(0,-3));return send(product?{...product,featured_image:product.featured_image.src}: {message:'Unavailable'},product?200:404);
   }
   if(pathname==='/products/gift-1'&&url.searchParams.get('view')==='quick-view')return send(await renderSection('quick-product',{}, {...base,product:products[0]}),200,'text/html');
   if(pathname==='/search/suggest')return send(await renderSection('predictive-search',{}, {...base,predictive_search:{performed:true,terms:url.searchParams.get('q'),resources:{products,collections:[],queries:[]}}}),200,'text/html');
   if(pathname==='/products/gift-2'){
    const product=structuredClone(products[1]);product.metafields.custom.personalization_enabled={value:true};return send(await renderTemplate('product',{...base,product,cart:cart(),request:{...base.request,page_type:'product'}}),200,'text/html');
   }
   if(pathname==='/recommendations/products')return send(await renderSection('product-recommendations',{}, {...base,recommendations:{performed:true,products_count:4,products}}),200,'text/html');
   if(pathname==='/cart'&&req.method==='POST')return send('<html><body><h1>Fixture checkout handoff received</h1></body></html>',200,'text/html');
   if(pathname==='/cart')return send(await renderTemplate('cart',{cart:cart()}),200,'text/html');
   if(htmlPages[pathname])return send(htmlPages[pathname],200,'text/html');
   return send('<h1>Fixture destination</h1>',200,'text/html');
  }catch(error){res.writeHead(500);res.end(error.stack);}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {server,url:`http://127.0.0.1:${server.address().port}`,events,cart,reset(){items=[];note='';events.length=0;},rejectAdd(){rejectNextAdd=true;}};
}
