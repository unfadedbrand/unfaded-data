'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../cart-1111.js');
const discount = { id: 1111, name: '11.11 — чем больше, тем больше', typeid: '2', applicationid: '3', rules: { type: 0, diff: { 1: 11, 2: 22, 3: 33 }, uids: [690719490763] } };
function item(sku, price, quantity = 1, extra = {}) {
  return { sku, price, quantity, amount: price * quantity, options: [{ option: 'Размер', variant: 'S' }], ...extra };
}
function product(sku, title, price, extra = {}) {
  return { externalid: sku, uid: sku + '-parent', title, price, url: 'https://unfadedstore.com/tproduct/123-456-product',
    gallery: JSON.stringify([{ img: 'https://static.tildacdn.com/product.jpg' }]), partuids: '[]',
    editions: [{ uid: sku + '-S', sku, price, quantity: 2, 'Размер': 'S' }], ...extra };
}
test('Moscow campaign boundaries are independent of host timezone', () => {
  assert.equal(core.inWindow(Date.parse('2026-11-08T18:59:59+03:00')), false);
  assert.equal(core.inWindow(Date.parse('2026-11-08T19:00:00+03:00')), true);
  assert.equal(core.inWindow(Date.parse('2026-11-12T23:59:59+03:00')), true);
  assert.equal(core.inWindow(Date.parse('2026-11-13T00:00:00+03:00')), false);
});
test('quantities of identical items count toward the tier; deleted items do not', () => {
  const s = core.state({ products: [item('TL01SS26', 15000, 3), item('X', 500, 8, { deleted: 'yes' })] }, [], true);
  assert.equal(s.quantity, 3); assert.equal(s.rate, .33); assert.equal(s.saving, 14850); assert.equal(s.goods, 30150);
});
test('capsule is excluded by section and by exact FW26 SKU, not last-year NY26', () => {
  const s = core.state({ products: [item('SW01NY26', 22000), item('ANY', 50000, 1, { part_uids: ['690719490763'] }), item('TB01FW26XS', 30000)] }, [], true);
  assert.equal(s.quantity, 1); assert.equal(s.eligibleSum, 22000); assert.equal(s.goods, 99580);
  assert.equal(core.excluded({ sku: 'TC01FW26' }), false);
  assert.equal(core.excluded({ sku: 'AS02FW26M' }), true);
});
test('capsule-only and empty carts do not get a tier', () => {
  assert.equal(core.state({ products: [item('JP01FW26', 40000)] }, [], true).rate, 0);
  assert.equal(core.state({ products: [] }, [], true).goods, 0);
});
test('never displays a hypothetical promotion as the actual checkout amount', () => {
  const c = { products: [item('TL01SS26', 15000)], prodamount: 15000, amount: 16000 };
  const before = structuredClone(c);
  const s = core.state(c, [], false);
  assert.equal(s.ready, false); assert.equal(s.saving, 0); assert.deepEqual(c, before);
});
test('native Tilda monetary values win, including kopeck rounding and excluding delivery', () => {
  const c = { products: [item('TL01SS26', 15000, 1, { discountid: 1111, amount_withdiscount: 13350.01 })],
    prodamount: 15000, prodamount_withdyndiscount: 13350.01, dyndiscount: 1649.99, amount: 14350.01, delivery: { price: 1000 } };
  const s = core.state(c, [discount], false);
  assert.equal(s.applied, true); assert.equal(s.goods, 13350.01); assert.equal(s.saving, 1649.99);
});
test('a winning promo/CREDITS code is not relabeled as 11.11', () => {
  const s = core.state({ products: [item('TL01SS26', 15000, 1, { discountid: 1111, amount_withdiscount: 13350 })],
    prodamount_withdyndiscount: 13350, dyndiscount: 1650, promocode: { promocode: 'CREDITS-ABC' } }, [discount], false);
  assert.equal(s.ready, false); assert.equal(s.promo, true);
});
test('another discount with the same percentage does not impersonate the campaign', () => {
  const s = core.state({ products: [item('X', 100, 1, { discountid: 9, amount_withdiscount: 89 })], prodamount_withdyndiscount: 89, dyndiscount: 11 }, [{ ...discount, name: 'Other sale', id: 9 }], false);
  assert.equal(s.ready, false);
});
test('localized API prices retain their decimals', () => {
  assert.equal(core.number('31 900.00'), 31900); assert.equal(core.number('1\u202f234,56'), 1234.56);
  assert.equal(core.number('<script>'), 0);
});
test('model identity and size are separate; recognize long size suffixes', () => {
  assert.equal(core.article({ sku: 'TL01SS26XS' }, ['TL01SS26']), 'TL01SS26');
  assert.equal(core.article({ sku: 'TL01SS26', options: [{ option: 'Размер', variant: 'S' }] }, ['TL01SS26']), 'TL01SS26');
  assert.equal(core.size('one size'), 'ONE');
});
test('recommendations use live stock, exclude capsule, archive and existing models', () => {
  const c = { products: [item('TL01SS26', 15000)] };
  const p = {
    TL01SS26: product('TL01SS26', 'Топ кружевной', 15000),
    SLS01SS26: product('SLS01SS26', 'Юбка Siren', 28600),
    SOLD: product('SOLD', 'Юбка без S', 100, { editions: [{ uid: 'q', price: 100, quantity: 0, 'Размер': 'S' }] }),
    NG: product('NG', 'Юбка новогодняя', 100, { partuids: '[690719490763]' }),
    ARCHIVE: product('ARCHIVE', 'Юбка архивная', 100, { partuids: '[491983923473]' })
  };
  assert.deepEqual(core.recommend(c, p).map(r => r.sku), ['SLS01SS26']);
  p.SLS01SS26.editions[0].quantity = 0;
  assert.deepEqual(core.recommend(c, p), []);
});
test('same look precedes new items, then full-price-on-Lamoda and other items', () => {
  const c = { products: [item('TL01SS26', 15000)] };
  const p = { TL01SS26: product('TL01SS26', 'Топ', 15000), OTHER: product('OTHER', 'Юбка', 100),
    SLS01SS26: product('SLS01SS26', 'Юбка Siren', 28600), NEW: product('NEW', 'Жакет', 500, { mark: 'NEW' }),
    FULL: product('FULL', 'Брюки', 300) };
  assert.deepEqual(core.recommend(c, p, { lamodaFullPriceSkus: ['FULL'] }).map(r => r.sku), ['SLS01SS26', 'NEW', 'FULL', 'OTHER']);
});
test('do not invent S if the cart size is missing or one size only', () => {
  const p = { X: product('X', 'Юбка', 500) };
  assert.deepEqual(core.recommend({ products: [item('TOP', 100, 1, { options: [] })] }, p), []);
  assert.deepEqual(core.recommend({ products: [item('TOP', 100, 1, { size: 'ONE', options: [] })] }, p), []);
});
test('primary category Tops and corsets does not turn a blouse into a corset', () => {
  assert.equal(core.category({ primaryCategory: 'Топы и корсеты', title: 'Топ с баской' }), 'top');
  assert.equal(core.category({ primaryCategory: 'Платья', title: 'Платье-корсет Hourglass' }), 'dress');
});
test('Tilda edition identity, size, inventory and section travel with the item', () => {
  const p = product('JH01FW26', 'Жакет Paparazzi', 31900, { partuids: '[123,456]', pack_m: 850 });
  const i = core.cartItem(p, p.editions[0]);
  assert.equal(i.uid, 'JH01FW26-S'); assert.equal(i.gen_uid, 'JH01FW26-parent'); assert.equal(i.recid, '123');
  assert.equal(i.price, 31900); assert.equal(i.inv, 2); assert.deepEqual(i.part_uids, ['123','456']);
  assert.deepEqual(i.options, [{ option: 'Размер', variant: 'S' }]);
  assert.equal(core.cartItem(p, { ...p.editions[0], quantity: 0 }), null);
});

test('native size-specific externalid is preserved for CRM instead of the base model SKU', () => {
  const p = product('TLB01SS26', 'Топ с баской, шампань', 16000);
  const ed = { ...p.editions[0], externalid: 'TLB01SS26XS', sku: 'TLB01SS26', 'Размер': 'XS' };
  assert.equal(core.cartItem(p, ed).sku, 'TLB01SS26XS');
  assert.equal(core.article(core.cartItem(p, ed), ['TLB01SS26']), 'TLB01SS26');
});
