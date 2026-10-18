/* Real catalog extras. Shopify remains authoritative for inventory and payment. */
(function () {
 'use strict';
 class GiftExtras {
  constructor(owner, commerce) {
   this.owner = owner; this.commerce = commerce; this.section = owner.querySelector('[data-gift-extras]');
   this.cards = [...this.section.querySelectorAll('[data-extra-card]')].map(node => ({node, variants: JSON.parse(node.querySelector('[data-extra-data]').textContent), max: Number(node.dataset.max), select: node.querySelector('[data-extra-select]'), variant: node.querySelector('[data-extra-variant]'), quantity: node.querySelector('[data-extra-quantity]')}));
   this.picker = this.section.querySelector('[data-extra-picker]');
   this.section.querySelector('[data-extra-picker-field]').hidden = false;
   this.picker.addEventListener('change', () => {
    const card = this.cards.find(card => card.variants.some(variant => String(variant.id) === this.picker.value));
    if (!card) return;
    card.variant.value = this.picker.value; card.select.checked = true; this.picker.value = ''; this.update();
    card.node.querySelector('[data-extra-quantity]').focus();
   });
   this.cards.forEach(card => card.node.querySelector('[data-extra-remove]').addEventListener('click', () => { card.select.checked = false; this.update(); this.picker.focus(); }));
   this.section.querySelector('[data-extra-grid]').hidden = false;
   this.section.querySelector('[data-extra-summary]').hidden = false;
   owner.form.addEventListener('change', () => this.update());
   owner.form.addEventListener('input', event => { if (event.target !== this.picker) this.update(); });
   this.update();
  }
  variant(card) { return card.variants.find(v => String(v.id) === card.variant.value); }
  update() {
   for (const card of this.cards) {
    const variant = this.variant(card); const rule = variant?.quantity_rule || {};
    card.quantity.min = rule.min || 1; card.quantity.step = rule.increment || 1;
    card.quantity.max = Math.min(card.max, rule.max || card.max);
    const available = variant?.available && Number(card.quantity.min) <= Number(card.quantity.max);
    card.select.disabled = !available; if (!available) card.select.checked = false;
    card.quantity.disabled = !card.select.checked;
    if (Number(card.quantity.value) < Number(card.quantity.min)) card.quantity.value = card.quantity.min;
    card.node.classList.toggle('is-selected', card.select.checked);
    card.node.hidden = !card.select.checked;
    card.node.querySelector('[data-extra-price]').textContent = variant ? this.commerce.money(variant.price) : 'Unavailable';
    card.node.querySelector('[data-extra-availability]').textContent = available ? `Up to ${card.quantity.max}` : variant?.available ? 'Quantity unavailable' : 'Sold Out';
   }
   const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Choose an extra to add';
   this.picker.replaceChildren(placeholder);
   for (const card of this.cards) {
    const group = document.createElement('optgroup'); group.label = card.node.querySelector('.extra-choice span').textContent;
    for (const variant of card.variants) {
     const option = document.createElement('option'); option.value = String(variant.id);
     const available = variant.available && (variant.quantity_rule?.min || 1) <= Math.min(card.max,variant.quantity_rule?.max || card.max);
     option.disabled = !available;
     option.textContent = `${group.label}${variant.title === 'Default Title' ? '' : ' — '+variant.title} — ${this.commerce.money(variant.price)}${available ? '' : ' — Sold Out'}`;
     group.append(option);
    }
    this.picker.append(group);
   }
   this.picker.disabled = !this.cards.some(card => card.variants.some(variant => variant.available && (variant.quantity_rule?.min || 1) <= Math.min(card.max,variant.quantity_rule?.max || card.max)));
   this.section.querySelector('[data-extra-empty]').hidden = !this.picker.disabled;
   const base = (this.owner.variant?.price || 0) * (Number(this.owner.form.elements.quantity.value) || 0);
   const extras = this.cards.filter(c => c.select.checked).reduce((sum, c) => sum + (this.variant(c)?.price || 0) * (Number(c.quantity.value) || 0), 0);
   const mobilePrice = this.owner.querySelector('[data-mobile-price]');
   if (mobilePrice) { mobilePrice.textContent = Number.isSafeInteger(base+extras) ? this.commerce.money(base+extras) : 'Check quantities'; const label = mobilePrice.parentElement.querySelector('small'); if (label) label.textContent = 'Estimated gift total'; }
   for (const [selector, value] of [['[data-base-total]',base],['[data-extras-total]',extras],['[data-gift-total]',base+extras]]) this.section.querySelector(selector).textContent = Number.isSafeInteger(value) && value >= 0 ? this.commerce.money(value) : 'Check quantities';
  }
  async prepare(root, request) {
   const quantity = Number(this.owner.form.elements.quantity.value);
   const selected = this.cards.filter(c => c.select.checked);
   const refreshed = await Promise.all([request(`${this.owner.dataset.productUrl}.js`), ...selected.map(c => request(`${root}products/${encodeURIComponent(c.node.dataset.handle)}.js`))]);
   const main = refreshed[0].variants.find(v => String(v.id) === this.owner.select.value);
   const old = this.owner.variant; let changed = main?.price !== old?.price;
   if (main) { Object.assign(old, main); this.owner.applyVariant(old, false); }
   const chosen = selected.map((card,index) => {
    const id = card.variant.value; const oldVariant = this.variant(card);
    card.variants = refreshed[index+1].variants;
    const variant = this.variant(card); changed ||= variant?.price !== oldVariant?.price;
    card.variant.querySelectorAll('option').forEach(option => { option.disabled = !card.variants.find(v => String(v.id) === option.value)?.available; });
    return {card,variant,id,quantity:Number(card.quantity.value)};
   });
   this.update();
   const validate = (variant,quantity,max,title) => {
    if (!variant?.available) throw new Error(`${title} is no longer available. Please choose another option.`);
    const rule = variant.quantity_rule || {};
    if (!Number.isSafeInteger(quantity) || quantity < (rule.min || 1) || quantity % (rule.increment || 1) || quantity > Math.min(max,rule.max || max)) throw new Error(`Please check the quantity for ${title}.`);
   };
   validate(main,quantity,Number.MAX_SAFE_INTEGER,'Your main gift');
   for (const line of chosen) validate(line.variant,line.quantity,line.card.max,line.card.node.querySelector('.extra-choice span').textContent);
   if (changed) throw new Error('A price changed. Review the updated total, then add your gift again.');
   const group = `WNW-${crypto.randomUUID()}`;
   const properties = {};
   for (const [key,value] of new FormData(this.owner.form)) if (key.startsWith('properties[') && typeof value === 'string' && value) properties[key.slice(11,-1)] = value;
   properties._wnw_group = group; properties._wnw_role = 'parent'; properties['Gift reference'] = group.slice(-8);
   const items = [{id:main.id,quantity,properties}, ...chosen.map(line => ({id:line.variant.id,quantity:line.quantity,properties:{_wnw_group:group,_wnw_role:'extra','Gift reference':group.slice(-8),'Gift for':this.owner.dataset.productTitle}}))];
   if (!Number.isSafeInteger(main.price * quantity + chosen.reduce((sum,line) => sum + line.variant.price * line.quantity,0))) throw new Error('Please reduce your quantities.');
   return {group,items};
  }
 }
 window.WrapGiftExtras = GiftExtras;
})();
