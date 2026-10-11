import sharp from 'sharp';
for(const width of [480,800,1200])await sharp('assets/gifting-editorial.webp').resize({width}).webp({quality:83}).toFile(`assets/gifting-editorial-${width}.webp`);
for(const name of ['personal','flowers','chocolates','giftbox','lifestyle','wedding'])await sharp(`assets/${name}.webp`).resize({width:320}).webp({quality:83}).toFile(`assets/${name}-320.webp`);
await sharp('assets/gifting-editorial.webp').extract({left:650,top:0,width:850,height:1024}).resize({width:750}).webp({quality:85}).toFile('assets/gifting-mobile.webp');
