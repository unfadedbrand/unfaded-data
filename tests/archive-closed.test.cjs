const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../archive-closed.js'),'utf8');
function run(products, eventType='click') {
  const handlers={}, box={setAttribute(){},style:{},textContent:''};
  const holder={prepend(){}};
  const target={closest(selector){return selector==='form'?holder:target;}};
  const document={readyState:'complete',body:holder,head:{appendChild(){}},
    addEventListener(type,fn){handlers[type]=fn;},getElementById(){return null;},
    querySelector(){return holder;},createElement(){return box;}};
  vm.runInNewContext(code,{window:{tcart:{products}},document,location:{pathname:'/catalog'}});
  let blocked=false;
  handlers[eventType]({target,preventDefault(){blocked=true;},stopImmediatePropagation(){}});
  return {blocked,message:box.textContent};
}
test('saved archive cart blocks click even with unavailable network',()=>{
  const result=run([{sku:'JC01SM25S',price:5600,quantity:1}]);
  assert.equal(result.blocked,true);assert.match(result.message,/Архив закрыт/);
});
test('Enter/submit cannot bypass closed archive',()=>{
  assert.equal(run([{sku:'JC01SM25S',price:5600}],'submit').blocked,true);
});
test('ordinary card for same model and upcoming BF price remain allowed',()=>{
  assert.equal(run([{sku:'LJ01SP25M',price:24900}]).blocked,false);
});
test('missing or further discounted archive price cannot reopen sale',()=>{
  assert.equal(run([{sku:'JC01SM25S'}]).blocked,true);
  assert.equal(run([{sku:'JC01SM25S',price:5000}]).blocked,true);
});
test('ordinary mixed cart without retired price is unaffected',()=>{
  assert.equal(run([{sku:'NEW-M',price:9000},{sku:'LJ01SP25M',price:36000}]).blocked,false);
});
