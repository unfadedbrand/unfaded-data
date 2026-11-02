'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const app=require('../campaign-1111.js');
const fs=require('node:fs');
function product(sku='JH01FW26', price=1000, quantity=2) {
 return {uid:123,externalid:sku,title:'Жакет',price,url:'https://unfadedstore.com/tproduct/123-456-test',gallery:'[]',partuids:'[]',editions:[{uid:987,sku,price,quantity,'Размер':'S'}]};
}
test('approved six outfits contain fifteen distinct products; links preserve the full catalog path',()=>{
 assert.equal(app.outfits.length,6);assert.equal(new Set(app.outfits.flatMap(l=>l.skus)).size,15);
 assert.equal(app.catalogUrl,'/#rec1717180551');assert.equal(app.looksUrl,'/?uf-page=looks-1111');
 assert.match(app.banner(),/ВЫБРАТЬ ВЕЩИ/);assert.match(app.banner(),/Готовые образы/);assert.doesNotMatch(app.banner(),/Кроме новогодней/);
});
test('only safe public product/photo URLs reach markup',()=>{
 assert.equal(app.safeUrl('javascript:alert(1)',false),'');assert.equal(app.safeUrl('https://evil.test/x',false),'');
 assert.equal(app.safeUrl('https://unfadedstore.com.evil.test/x',false),'');assert.equal(app.safeUrl('http://unfadedstore.com/x',false),'');
 assert.equal(app.safeUrl('https://static.tildacdn.com/x.jpg',true),'https://static.tildacdn.com/x.jpg');
});
test('sizes come only from current sellable editions, including ONE and stock zero',()=>{
 const p=product();p.editions.push({uid:988,price:1000,quantity:0,'Размер':'M'},{uid:989,price:1000,quantity:1,'Размер':'ONE'});
 assert.deepEqual(app.editions(p).map(x=>x.uid),[987,989]);
 p.partuids='["690719490763"]';assert.deepEqual(app.editions(p),[]);
 p.partuids='["491983923473"]';assert.deepEqual(app.editions(p),[]);
});
test('edition prices and existing eligible cart quantities set the estimate without mutating the cart',()=>{
 const p=product(),cart={products:[{sku:'SW01NY26',quantity:2,price:500},{sku:'JP01FW26',quantity:5,price:999}]};
 const before=structuredClone(cart);const result=app.estimate([{product:p,edition:{price:1500}}],cart);
 assert.equal(result.rate,.33);assert.equal(result.total,1005);assert.deepEqual(cart,before);
 assert.equal(app.estimate([],cart).rate,0);
});
test('promotion estimates never stack with a promo code, and retain kopecks',()=>{
 const p=product('JH01FW26',1000.01);const rows=[{product:p}];
 assert.equal(app.estimate(rows,{}).total,890.01);
 assert.equal(app.estimate(rows,{promocode:'EXISTING'}).total,1000.01);
 assert.equal(app.estimate(rows,{promocode:'EXISTING'}).rate,0);
});
test('preflight validates every item before any native cart operation',()=>{
 const p=product();const selected=[{sku:'JH01FW26',uid:987,price:1000}];
 const ready=app.validate(selected,{'JH01FW26':p},{products:[]});assert.equal(ready[0].uid,'987');assert.equal(ready[0].price,1000);
 assert.throws(()=>app.validate(selected,{'JH01FW26':product('JH01FW26',1000,0)},{}),/размер/);
 assert.throws(()=>app.validate(selected,{'JH01FW26':product('JH01FW26',1100)},{}),/Цена обновилась/);
 assert.throws(()=>app.validate(selected,{'JH01FW26':p},{products:[{uid:987,quantity:2}]}),/больше нет/);
 assert.throws(()=>app.validate(selected.concat({sku:'MISSING',uid:88,price:1000}),{'JH01FW26':p},{}),/размер/);
 assert.throws(()=>app.validate([],{},{}),/хотя бы/);
});
test('catalog follows pagination, deduplicates sections, and normalizes edition SKU',async()=>{
 const seen=[];const p=product();p.externalid='';
 const fake={AbortController,setTimeout,clearTimeout,fetch:async url=>{seen.push(url);const slice=Number(new URL(url).searchParams.get('slice'));return {ok:true,json:async()=>({products:slice===1?[]:[p],nextslice:slice===1?2:0,total:1})};}};
 const load=app.createCatalog(fake,[['179','123']]);const result=await load(true);assert.ok(result.JH01FW26);assert.equal(seen.length,2);
 await load(false);assert.equal(seen.length,2);await load(true);assert.equal(seen.length,4);
});
test('any failed section blocks forced refresh instead of returning stale stock',async()=>{
 let fail=false;const fake={AbortController,setTimeout,clearTimeout,fetch:async()=>({ok:!fail,json:async()=>({products:[product()],total:1,nextslice:0})})};
 const load=app.createCatalog(fake,[['179','123']]);await load(true);fail=true;await assert.rejects(load(true),/разделы/);
});
test('repeating pagination cursor fails closed instead of accepting an incomplete stock snapshot',async()=>{
 let calls=0;const fake={AbortController,setTimeout,clearTimeout,fetch:async()=>{calls++;return {ok:true,json:async()=>({products:[product()],total:999,nextslice:2})};}};
 await assert.rejects(app.createCatalog(fake,[['179','123']])(true),/разделы/);assert.equal(calls,2);
});
test('disabled loader and public preview cannot mount or fetch',()=>{
 let touched=false;const fake={document:{},location:{hostname:'unfadedstore.com'},UF1111_CAMPAIGN_SETTINGS:{enabled:false,preview:true},fetch(){touched=true;}};
 app.start(fake);assert.equal(touched,false);assert.equal(fake.__uf1111CampaignStarted,undefined);
 const source=fs.readFileSync(require.resolve('../brand-popup-fix.js'),'utf8');assert.match(source,/UF1111_CAMPAIGN_SETTINGS = \{ enabled: false \}/);
});
