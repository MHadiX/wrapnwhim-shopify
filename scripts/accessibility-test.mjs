import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { fixtureServer } from './fixture-server.mjs';
import { writeFile } from 'node:fs/promises';
const f=await fixtureServer();const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const results=[];
try{
 for(const route of ['/','/products/gift-1','/collections/all','/pages/gift-box-builder','/pages/contact','/pages/wishlist','/search']){
  await page.goto(f.url+route,{waitUntil:'networkidle'});const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();results.push({route,violations:result.violations});console.log(route,result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
 }
 await page.goto(f.url,{waitUntil:'networkidle'});await page.locator('[data-open="SearchDrawer"]').click();await page.locator('#SearchInput').fill('gift');await page.waitForSelector('.predictive-item');const search=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();results.push({route:'predictive search dialog',violations:search.violations});console.log('Search dialog',search.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
 await writeFile('test-results/accessibility-results.json',JSON.stringify(results,null,2));
 if(results.some(r=>r.violations.length))process.exitCode=1;
}finally{await browser.close();await new Promise(r=>f.server.close(r));}
