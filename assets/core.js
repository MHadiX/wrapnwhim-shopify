/* Pure commerce helpers, shared by the storefront and regression tests. */
(function (root) {
  'use strict';
  const integer = (value, min = 0) => Number.isSafeInteger(Number(value)) && Number(value) >= min;
  function resolveVariant(variants, options) {
    return variants.find(variant => variant.options.length === options.length && variant.options.every((value, i) => value === options[i])) || null;
  }
  function money(cents, currency = 'PKR', locale = 'en-PK') {
    if (!Number.isFinite(cents)) throw new Error('Price is unavailable.');
    return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cents / 100);
  }
  function validateUpload(file, maxMB) {
    if (!file) return '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Please choose a JPG, PNG, or WebP image.';
    if (file.size === 0) return 'This file is empty. Please choose another image.';
    if (file.size > maxMB * 1024 * 1024) return `Please choose an image smaller than ${maxMB} MB.`;
    return '';
  }
  function findVariant(catalog, id) {
    for (const product of [catalog.box, ...catalog.items, ...catalog.wrapping, catalog.card].filter(Boolean)) {
      const variant = product.variants.find(v => Number(v.id) === Number(id));
      if (variant) return { product, variant };
    }
    return null;
  }
  function builderSelection(catalog, draft) {
    const selected = [];
    for (const [role, id, quantity] of [
      ['Box', draft.box, 1],
      ...Object.entries(draft.items || {}).map(([id, qty]) => ['Gift item', Number(id), Number(qty)]),
      ['Wrapping', draft.wrapping, 1], ['Greeting card', draft.card, 1]
    ]) {
      if (!id || !quantity) continue;
      const allowed = role === 'Box' ? [catalog.box] : role === 'Gift item' ? catalog.items : role === 'Wrapping' ? catalog.wrapping : [catalog.card];
      const product = allowed.filter(Boolean).find(product => product.variants.some(v => Number(v.id) === Number(id)));
      const variant = product?.variants.find(v => Number(v.id) === Number(id));
      const found = product && variant ? { product, variant } : null;
      if (!found || !integer(quantity, 1)) throw new Error('Please select an appropriate product and whole quantity for each gift box step.');
      if (product.eligible === false) throw new Error(`${product.title} must be configured on its own product page.`);
      if (!variant.available) throw new Error(`${found.product.title} is currently sold out. Please choose another gift.`);
      if (quantity < (variant.min || 1) || (variant.max && quantity > variant.max) || quantity % (variant.increment || 1) !== 0) throw new Error(`Please check the quantity for ${found.product.title}.`);
      selected.push({ ...found, quantity, role });
    }
    return selected;
  }
  function validateBuilder(catalog, draft, min, max) {
    if (!catalog.box.variants.some(v => Number(v.id) === Number(draft.box) && v.available)) throw new Error('Choose an available gift box.');
    const count = Object.values(draft.items || {}).reduce((total, value) => total + Number(value), 0);
    if (!integer(count, min) || count > max) throw new Error(`Choose between ${min} and ${max} gift items.`);
    return builderSelection(catalog, draft);
  }
  function builderTotal(catalog, draft) {
    return builderSelection(catalog, draft).reduce((sum, line) => sum + line.variant.price * line.quantity, 0);
  }
  function builderLines(catalog, draft, reference, min, max) {
    const selected = validateBuilder(catalog, draft, min, max);
    return selected.map(({ variant, quantity, role }) => ({ id: variant.id, quantity, properties: {
      '_gift_box_id': reference, '_gift_box_role': role, 'Gift box reference': reference,
      ...(draft.name ? { 'Recipient name': String(draft.name).slice(0, 60) } : {}),
      ...(role === 'Box' && draft.message ? { 'Gift message': String(draft.message).slice(0, 300) } : {}),
      ...(role === 'Box' && draft.occasion ? { 'Occasion': String(draft.occasion).slice(0, 60) } : {})
    } }));
  }
  root.WrapCommerce = { resolveVariant, money, validateUpload, findVariant, builderSelection, validateBuilder, builderTotal, builderLines };
})(typeof window === 'undefined' ? globalThis : window);
