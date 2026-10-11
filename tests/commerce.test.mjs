import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/core.js';
const C = globalThis.WrapCommerce;
const product = (id, title, price, extra = {}) => ({id,title,handle:`gift-${id}`,variants:[{id:id*10,title:'Default Title',price,available:true,min:1,max:null,increment:1,...extra}]});
const catalog = {box:product(1,'Box',100000),items:[product(2,'Mug',80000),product(3,'Chocolates',120000)],wrapping:[product(4,'Ribbon',15000)],card:product(5,'Card',10000)};
const draft = {box:10,items:{20:1,30:2},wrapping:40,card:50,name:'Amina',message:'With love',occasion:'Birthday'};
test('variant resolution does not substitute an unavailable combination',()=>{
 const variants=[{id:1,options:['Navy','Standard'],available:true},{id:2,options:['Ivory','Premium'],available:false}];
 assert.equal(C.resolveVariant(variants,['Navy','Premium']),null);
 assert.equal(C.resolveVariant(variants,['Ivory','Premium']).available,false);
 assert.equal(C.resolveVariant(variants,['Navy','Standard']).id,1);
});
test('gift box totals use variant prices and actual component quantities',()=>{
 assert.equal(C.builderTotal(catalog,draft),445000);
 const lines=C.builderLines(catalog,draft,'WNW-TEST',2,8);
 assert.equal(lines.length,5);
 assert.equal(lines.find(line=>line.id===30).quantity,2);
 assert.ok(lines.every(line=>line.properties['_gift_box_id']==='WNW-TEST' && line.properties['Gift box reference']==='WNW-TEST'));
 assert.equal(lines[0].properties['Gift message'],'With love');
 assert.equal(lines[1].properties['Gift message'],undefined);
});
test('gift box rejects missing boxes, invalid quantities, and products in the wrong role',()=>{
 assert.throws(()=>C.validateBuilder(catalog,{...draft,box:null},2,8),/available gift box/);
 assert.throws(()=>C.validateBuilder(catalog,{...draft,items:{20:1}},2,8),/between 2 and 8/);
 assert.throws(()=>C.validateBuilder(catalog,{...draft,items:{20:9}},2,8),/between 2 and 8/);
 assert.throws(()=>C.builderSelection(catalog,{...draft,items:{20:1.5}}),/appropriate product/);
 assert.throws(()=>C.builderSelection(catalog,{...draft,items:{999:2}}),/appropriate product/);
 assert.throws(()=>C.builderSelection(catalog,{...draft,wrapping:20}),/appropriate product/);
});
test('gift box rejects sold-out variants and honors Shopify quantity rules',()=>{
 const unavailable=structuredClone(catalog); unavailable.items[0].variants[0].available=false;
 assert.throws(()=>C.validateBuilder(unavailable,draft,2,8),/sold out/);
 const limited=structuredClone(catalog); limited.items[1].variants[0].max=1;
 assert.throws(()=>C.validateBuilder(limited,draft,2,8),/quantity/);
 const increments=structuredClone(catalog); increments.items[0].variants[0].increment=2;
 assert.throws(()=>C.validateBuilder(increments,draft,2,8),/quantity/);
});
test('personalization properties are bounded and contain no pricing overrides',()=>{
 const lines=C.builderLines(catalog,{...draft,name:'x'.repeat(90),message:'m'.repeat(900)},'REF',2,8);
 assert.equal(lines[0].properties['Recipient name'].length,60);
 assert.equal(lines[0].properties['Gift message'].length,300);
 assert.ok(lines.every(line=>Object.keys(line).join(',')==='id,quantity,properties'));
});
test('upload validation rejects empty, oversized, and unsupported files',()=>{
 assert.equal(C.validateUpload({type:'image/png',size:1024},10),'');
 assert.match(C.validateUpload({type:'text/html',size:1024},10),/JPG/);
 assert.match(C.validateUpload({type:'image/jpeg',size:11*1024*1024},10),/smaller/);
 assert.match(C.validateUpload({type:'image/webp',size:0},10),/empty/);
});
test('PKR formatting handles cents without a pretend currency conversion',()=>{
 assert.match(C.money(125000,'PKR'),/1,250/);
 assert.match(C.money(125050,'PKR'),/1,250.5/);
 assert.throws(()=>C.money(NaN),/unavailable/);
});
test('Shopify merchant money formats preserve PKR, decimal separators, and safe integers',()=>{
 assert.equal(C.shopMoney(349950,'Rs. {{ amount }} PKR'),'Rs. 3,499.50 PKR');
 assert.equal(C.shopMoney(349950,'Rs {{amount_no_decimals}}'),'Rs 3,500');
 assert.equal(C.shopMoney(349950,'{{ amount_with_comma_separator }} PKR'),'3.499,50 PKR');
 assert.throws(()=>C.shopMoney(12.5,'{{amount}}'));
});
