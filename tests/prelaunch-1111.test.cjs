'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../cart-1111.js');

test('public campaign excludes the club evening and switches off at Moscow midnight', () => {
  for (const date of ['2026-11-08T18:45:00+03:00','2026-11-08T19:00:00+03:00','2026-11-08T23:59:59+03:00'])
    assert.equal(core.inPublicWindow(Date.parse(date)), false);
  assert.equal(core.inPublicWindow(Date.parse('2026-11-09T00:00:00+03:00')), true);
  assert.equal(core.inPublicWindow(Date.parse('2026-11-12T23:59:59+03:00')), true);
  assert.equal(core.inPublicWindow(Date.parse('2026-11-13T00:00:00+03:00')), false);
});

test('remote cart review requires the same exact URL and deployed permission as the campaign', () => {
  const location = {hostname:'unfadedstore.com',pathname:'/',search:'?uf-review=1111-2026'};
  assert.equal(core.reviewAllowed({reviewEnabled:true},location), true);
  for (const loc of [{...location,hostname:'evil.test'},{...location,pathname:'/catalog'},{...location,search:'?preview=1'}, {...location,search:'?early=member'}])
    assert.equal(core.reviewAllowed({reviewEnabled:true},loc), false);
  assert.equal(core.reviewAllowed({preview:true},location), false);
});

function loader(location, time='2026-11-05T12:00:00+03:00', readyState='complete') {
  const all = fs.readFileSync(require.resolve('../brand-popup-fix.js'),'utf8');
  const start = all.indexOf('// One loader for the cart, banner and looks.');
  const script = all.slice(start,all.indexOf('\n})();',start)+6);
  const nodes = [], listeners = [], timers = new Map();
  let now = Date.parse(time), seq = 0;
  const document = {readyState,querySelector:()=>null,head:{appendChild:n=>nodes.push(n)},
    createElement:tag=>({tag,setAttribute(k,v){this[k]=v}}),addEventListener:(...args)=>listeners.push(args)};
  const window = {};
  class Clock extends Date { static now() { return now; } }
  vm.runInNewContext(script,{location,window,document,URLSearchParams,Date:Clock,
    setInterval:fn=>{timers.set(++seq,fn);return seq;},clearInterval:id=>timers.delete(id)});
  return {window,nodes,listeners,timers,advance(time){now=Date.parse(time);[...timers.values()].forEach(fn=>fn());}};
}

test('scheduled loader leaves regular storefront and catalogue unloaded before public start', () => {
  for (const loc of [
    {hostname:'unfadedstore.com',pathname:'/',search:''},
    {hostname:'unfadedstore.com',pathname:'/catalog',search:'?uf-review=1111-2026'},
    {hostname:'evil.test',pathname:'/',search:'?uf-review=1111-2026'}]) {
    const r=loader(loc);assert.equal(r.nodes.length,0);assert.equal(r.listeners.length,0);
  }
});

test('review loader loads one shared core, both styles, then the campaign once', () => {
  const r=loader({hostname:'unfadedstore.com',pathname:'/',search:'?uf-review=1111-2026'});
  assert.equal(r.window.UF1111_SETTINGS.enabled,true);
  assert.equal(r.window.UF1111_SETTINGS.reviewEnabled,true);
  assert.equal(r.window.UF1111_CAMPAIGN_SETTINGS.enabled,true);
  assert.equal(r.nodes.filter(n=>n.tag==='script').length,1);
  assert.deepEqual(r.nodes.filter(n=>n.tag==='link').map(n=>n['data-uf1111-file']),['cart-1111.css','campaign-1111.css']);
  r.nodes.find(n=>n.tag==='script').onload();
  assert.equal(r.nodes.filter(n=>n.tag==='script').length,2);
  assert.match(r.nodes.at(-1).src,/campaign-1111\.js\?v=scheduled20261105$/);
});

test('already open tabs mount exactly once at public midnight and not in club hours',()=>{
  for (const pathname of ['/','/catalog']) {
    const r=loader({hostname:'unfadedstore.com',pathname,search:''});
    for (const time of ['2026-11-08T19:00:00+03:00','2026-11-08T23:59:59+03:00']) {
      r.advance(time);assert.equal(r.nodes.length,0);
    }
    r.advance('2026-11-09T00:00:00+03:00');
    assert.equal(r.nodes.length,3);assert.equal(r.timers.size,0);
    r.advance('2026-11-09T12:00:00+03:00');assert.equal(r.nodes.length,3);
  }
});

test('fresh visits mount within the public window and stay unloaded at its end',()=>{
  const location={hostname:'unfadedstore.com',pathname:'/',search:'?uf-page=looks-1111'};
  for (const time of ['2026-11-09T00:00:00+03:00','2026-11-12T23:59:59+03:00'])
    assert.equal(loader(location,time).nodes.length,3);
  const r=loader(location,'2026-11-13T00:00:00+03:00');
  assert.equal(r.nodes.length,0);assert.equal(r.timers.size,0);
});
