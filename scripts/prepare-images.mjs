import sharp from 'sharp';
import { stat } from 'node:fs/promises';
const hero = '/workspace/generated_images/exec-d43a8036-dc1a-4b92-bee6-06ab4cc12e33.png';
const sheet = '/workspace/generated_images/exec-dfacf7ae-29d6-4c1a-9468-ca4b1e75ed2c.png';
await sharp(hero).resize({width:1920,withoutEnlargement:true}).webp({quality:86}).toFile('assets/gifting-editorial.webp');
const {width,height} = await sharp(sheet).metadata();
for (const [i,name] of ['personal','flowers','chocolates','giftbox','lifestyle','wedding'].entries()) {
 await sharp(sheet).extract({left:Math.floor(i%3*width/3),top:Math.floor(Math.floor(i/3)*height/2),width:Math.floor(width/3),height:Math.floor(height/2)}).webp({quality:88}).toFile(`assets/${name}.webp`);
}
for(const name of ['gifting-editorial','personal','flowers','chocolates','giftbox','lifestyle','wedding']) console.log(name, (await stat(`assets/${name}.webp`)).size);
