/* WrapnWhim: Shopify-native storefront interactions. No third-party runtime libraries. */
(() => {
  'use strict';
  const config = JSON.parse(document.getElementById('StoreConfig')?.textContent || '{"root":"/","currency":"PKR"}');
  const C = window.WrapCommerce;
  const root = config.root.endsWith('/') ? config.root : `${config.root}/`;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const money = cents => C.money(cents, config.currency);
  const status = message => { const el = document.getElementById('StoreStatus'); if (el) el.textContent = message; };
  const el = (tag, attrs = {}, text = '') => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => { if (value !== null && value !== undefined) node.setAttribute(key, value); });
    node.textContent = text;
    return node;
  };
  async function request(path, options = {}) {
    const response = await fetch(path, { credentials: 'same-origin', ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.description === 'string' ? data.description : typeof data.message === 'string' ? data.message : 'Something went wrong. Please try again.');
    return data;
  }
  const jsonPost = (path, data) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
  const storage = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { status('Browser storage is unavailable. Your selections are kept only for this visit.'); return false; } }
  };
  let saved = storage.get('wrapnwhim-wishlist', []);
  if (!Array.isArray(saved)) saved = [];
  saved = saved.filter(handle => typeof handle === 'string' && /^[a-z0-9-]+$/.test(handle)).slice(0, 100);
  function syncHearts() {
    document.querySelectorAll('[data-wishlist]').forEach(button => button.setAttribute('aria-pressed', String(saved.includes(button.dataset.wishlist))));
  }
  let lastFocus;
  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog || dialog.open) return;
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    lastFocus = document.activeElement;
    dialog.showModal(); document.body.classList.add('dialog-open');
    if (id === 'SearchDrawer') dialog.querySelector('input')?.focus();
    if (id === 'CartDrawer') refreshCart().catch(showCartError);
    if (id === 'WishlistDrawer') dialog.querySelector('wishlist-list')?.render();
  }
  function closeDialog(dialog) {
    dialog?.close(); document.body.classList.remove('dialog-open'); lastFocus?.focus();
  }
  document.addEventListener('click', async event => {
    const opener = event.target.closest('[data-open]');
    if (opener) openDialog(opener.dataset.open);
    const closer = event.target.closest('[data-close]');
    if (closer) closeDialog(closer.closest('dialog'));
    const heart = event.target.closest('[data-wishlist]');
    if (heart) {
      const handle = heart.dataset.wishlist;
      saved = saved.includes(handle) ? saved.filter(h => h !== handle) : [...saved, handle].slice(-100);
      storage.set('wrapnwhim-wishlist', saved); syncHearts(); status(saved.includes(handle) ? 'Gift saved to your wishlist.' : 'Gift removed from your wishlist.');
      document.querySelectorAll('wishlist-list').forEach(list => list.render());
    }
    const quickAdd = event.target.closest('[data-quick-add]');
    if (quickAdd && !quickAdd.disabled) {
      const error = quickAdd.closest('.product-card').querySelector('[data-card-error]');
      const label = quickAdd.innerHTML;
      quickAdd.disabled = true; quickAdd.setAttribute('aria-busy', 'true');
      quickAdd.textContent = 'Adding…'; error.textContent = '';
      try {
        const result = await jsonPost(`${root}cart/add.js`, {
          items: [{ id: Number(quickAdd.dataset.quickAdd), quantity: Number(quickAdd.dataset.quantity) || 1 }],
          sections: ['cart-drawer'], sections_url: location.pathname
        });
        try { await refreshCart(result.sections?.['cart-drawer']); }
        catch { location.assign(`${root}cart`); return; }
        openDialog('CartDrawer'); status('Your gift was added to the bag.');
      } catch (failure) { error.textContent = failure.message; }
      finally { quickAdd.disabled = false; quickAdd.removeAttribute('aria-busy'); quickAdd.innerHTML = label; }
    }
    const quick = event.target.closest('[data-quick-view]');
    if (quick) {
      quick.disabled = true;
      try {
        const url = new URL(quick.dataset.quickView, location.origin); url.searchParams.set('view', 'quick-view');
        const response = await fetch(url); if (!response.ok) throw new Error('Unable to load this gift.');
        const html = await response.text();
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const content = parsed.querySelector('.quick-product-content');
        if (!content) throw new Error('Unable to load this gift.');
        document.querySelector('[data-quick-content]').replaceChildren(content);
        openDialog('QuickView'); syncHearts();
      } catch { location.assign(quick.dataset.quickView); }
      finally { quick.disabled = false; }
    }
    const remove = event.target.closest('[data-cart-remove]');
    if (remove) { event.preventDefault(); updateLine(remove.dataset.cartRemove, 0); }
    const dialog = event.target.closest('dialog');
    if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(dialog); }
  });
  document.addEventListener('close', event => { if (event.target.matches?.('dialog') && !document.querySelector('dialog[open]')) { document.body.classList.remove('dialog-open'); lastFocus?.focus(); } }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.mega-menu[open]').forEach(d => d.open = false);
  });
  document.querySelectorAll('.mega-menu').forEach(menu => menu.addEventListener('toggle', () => { if (menu.open) document.querySelectorAll('.mega-menu').forEach(other => { if (other !== menu) other.open = false; }); }));
  window.addEventListener('storage', event => { if (event.key === 'wrapnwhim-wishlist') { saved = storage.get('wrapnwhim-wishlist', []); if (!Array.isArray(saved)) saved = []; syncHearts(); document.querySelectorAll('wishlist-list').forEach(list => list.render()); } });

  class HeroSlideshow extends HTMLElement {
    connectedCallback() {
      if (this.ready) return; this.ready = true;
      this.slides = [...this.querySelectorAll('[data-slide]')]; this.index = 0; this.paused = !this.dataset.autoplay || this.dataset.autoplay === 'false' || reducedMotion.matches;
      this.querySelector('[data-prev]')?.addEventListener('click', () => this.go(this.index - 1, true));
      this.querySelector('[data-next]')?.addEventListener('click', () => this.go(this.index + 1, true));
      this.querySelectorAll('[data-dot]').forEach(dot => dot.addEventListener('click', () => this.go(Number(dot.dataset.dot), true)));
      this.querySelector('[data-pause]')?.addEventListener('click', () => { this.paused = !this.paused; this.schedule(); });
      this.addEventListener('keydown', event => { if (!event.target.matches('button')) return; if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); this.go(this.index + (event.key === 'ArrowRight' ? 1 : -1), true); } });
      this.addEventListener('pointerdown', event => { this.startX = event.clientX; this.startY = event.clientY; });
      this.addEventListener('pointerup', event => { if (Math.abs(event.clientX - this.startX) > 55 && Math.abs(event.clientY - this.startY) < 60) this.go(this.index + (event.clientX < this.startX ? 1 : -1), true); });
      this.addEventListener('focusin', () => { this.paused = true; this.schedule(); });
      this.addEventListener('mouseenter', () => { this.hovering = true; this.schedule(); });
      this.addEventListener('mouseleave', () => { this.hovering = false; this.schedule(); });
      this.onVisibility = () => this.schedule(); document.addEventListener('visibilitychange', this.onVisibility);
      this.onMotion = () => { if (reducedMotion.matches) this.paused = true; this.schedule(); }; reducedMotion.addEventListener('change', this.onMotion);
      this.schedule();
      this.addEventListener('shopify:block:select', event => { const index = this.slides.indexOf(event.target.closest('[data-slide]')); if (index >= 0) this.go(index, true); });
    }
    go(index, interaction = false) {
      if (!this.slides.length) return;
      this.index = (index + this.slides.length) % this.slides.length;
      this.slides.forEach((slide, i) => slide.hidden = i !== this.index);
      this.querySelectorAll('[data-dot]').forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === this.index)));
      if (interaction) { this.paused = true; status(`Slide ${this.index + 1} of ${this.slides.length}`); }
      this.schedule();
    }
    schedule() {
      clearTimeout(this.timer);
      const button = this.querySelector('[data-pause]');
      if (button) { button.textContent = this.paused ? 'Play' : 'Pause'; button.setAttribute('aria-label', this.paused ? 'Play slideshow' : 'Pause slideshow'); }
      if (!this.paused && !this.hovering && !document.hidden && !reducedMotion.matches && this.slides.length > 1) this.timer = setTimeout(() => this.go(this.index + 1), Number(this.dataset.speed) || 7000);
    }
    disconnectedCallback() { clearTimeout(this.timer); document.removeEventListener('visibilitychange', this.onVisibility); reducedMotion.removeEventListener('change', this.onMotion); }
  }
  customElements.define('hero-slideshow', HeroSlideshow);
  class AnnouncementBar extends HTMLElement {
    connectedCallback() {
      this.messages = [...this.querySelectorAll('[data-announcement]')]; this.index = 0; this.paused = reducedMotion.matches;
      this.querySelector('[data-pause]')?.addEventListener('click', () => { this.paused = !this.paused; this.querySelector('[data-pause]').textContent = this.paused ? 'Play' : 'Pause'; this.querySelector('[data-pause]').setAttribute('aria-label', this.paused ? 'Play announcements' : 'Pause announcements'); });
      this.addEventListener('focusin', () => { this.paused = true; const b = this.querySelector('[data-pause]'); if (b) { b.textContent = 'Play'; b.setAttribute('aria-label', 'Play announcements'); } });
      this.timer = setInterval(() => { if (this.paused || document.hidden || reducedMotion.matches || this.matches(':hover')) return; this.index = (this.index + 1) % this.messages.length; this.messages.forEach((item, i) => item.hidden = i !== this.index); }, Number(this.dataset.speed) || 6000);
    }
    disconnectedCallback() { clearInterval(this.timer); }
  }
  customElements.define('announcement-bar', AnnouncementBar);
  class ScrollCarousel extends HTMLElement {
    connectedCallback() { this.querySelectorAll('[data-prev],[data-next]').forEach(button => button.addEventListener('click', () => { const track = this.querySelector('[data-scroll]'); track.scrollBy({ left: track.clientWidth * (button.hasAttribute('data-next') ? 1 : -1), behavior: reducedMotion.matches ? 'instant' : 'smooth' }); })); }
  }
  customElements.define('scroll-carousel', ScrollCarousel);

  class ProductGallery extends HTMLElement {
    connectedCallback() {
      this.frames = [...this.querySelectorAll('[data-media-id]')];
      this.querySelectorAll('[data-thumbnail]').forEach(button => button.addEventListener('click', () => this.show(button.dataset.thumbnail)));
      this.addEventListener('click', event => { const zoom = event.target.closest('[data-zoom]'); if (!zoom) return; const dialog = this.querySelector('dialog'); this.querySelector('[data-full-image]').src = zoom.dataset.fullSrc; lastFocus = zoom; dialog.showModal(); document.body.classList.add('dialog-open'); });
      const track = this.querySelector('[data-gallery-track]');
      track?.addEventListener('pointerdown', event => { this.x = event.clientX; this.y = event.clientY; });
      track?.addEventListener('pointerup', event => { if (event.target.closest('video,iframe') || Math.abs(event.clientX - this.x) < 50 || Math.abs(event.clientY - this.y) > 70) return; const i = this.frames.findIndex(frame => !frame.hidden); this.show(this.frames[(i + (event.clientX < this.x ? 1 : -1) + this.frames.length) % this.frames.length]?.dataset.mediaId); });
    }
    show(id) { if (!this.frames.some(frame => frame.dataset.mediaId === String(id))) return; this.frames.forEach(frame => { frame.hidden = frame.dataset.mediaId !== String(id); if (frame.hidden) frame.querySelectorAll('video').forEach(video => video.pause()); }); this.querySelectorAll('[data-thumbnail]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.thumbnail === String(id)))); }
  }
  customElements.define('product-gallery', ProductGallery);

  class ProductForm extends HTMLElement {
    connectedCallback() {
      if (this.ready) return; this.ready = true;
      this.form = this.querySelector('form'); if (!this.form) return;
      this.variants = JSON.parse(this.querySelector('[data-variants]').textContent);
      this.select = this.querySelector('[data-variant-select]'); this.add = this.querySelector('[data-add]');
      const controls = this.querySelector('[data-option-controls]'); if (controls) { controls.hidden = false; this.querySelector('.no-js-variant').hidden = true; }
      this.form.addEventListener('change', event => {
        if (event.target.matches('.variant-options input')) this.updateVariant();
        if (event.target === this.select) this.applyVariant(this.variants.find(v => v.id === Number(this.select.value)));
        if (event.target.matches('[data-upload]')) this.checkUpload(event.target);
      });
      this.querySelector('[data-quantity-minus]')?.addEventListener('click', () => { const qty = this.form.elements.quantity; qty.stepDown(); qty.dispatchEvent(new Event('change', { bubbles: true })); });
      this.querySelector('[data-quantity-plus]')?.addEventListener('click', () => { const qty = this.form.elements.quantity; qty.stepUp(); qty.dispatchEvent(new Event('change', { bubbles: true })); });
      this.querySelectorAll('[data-counter]').forEach(input => input.addEventListener('input', () => {
        this.querySelector(`[data-count-for="${input.id}"]`).textContent = `${input.value.length} / ${input.maxLength}`;
        const target = this.querySelector(`[data-preview-${input.dataset.previewField}]`); if (target) target.textContent = input.value || (input.dataset.previewField === 'name' ? 'Your special someone' : 'A little note from the heart.');
      }));
      this.form.addEventListener('submit', event => this.submit(event));
      this.mobileButton = this.querySelector('[data-mobile-add]');
      this.mobileBar = this.querySelector('[data-mobile-purchase]');
      this.mobileButton?.addEventListener('click', () => this.form.requestSubmit(this.add));
      if (this.mobileBar) {
        this.purchaseObserver = new IntersectionObserver(entries => {
          this.mobileBar.hidden = entries[0].isIntersecting;
        }, { rootMargin: '-90px 0px 0px' });
        this.purchaseObserver.observe(this.add);
      }
      this.applyVariant(this.variants.find(v => v.id === Number(this.select.value)), false);
    }
    updateVariant() {
      const options = [...this.querySelectorAll('[data-option-index]')].map(group => group.querySelector('input:checked')?.value);
      this.applyVariant(C.resolveVariant(this.variants, options));
    }
    applyVariant(variant, updateURL = true) {
      this.variant = variant;
      this.add.disabled = this.busy || !variant?.available; this.add.textContent = this.busy ? 'Adding your gift…' : !variant ? 'Unavailable combination' : variant.available ? 'Add to gift bag' : 'Sold out';
      if (this.mobileButton) { this.mobileButton.disabled = this.add.disabled; this.mobileButton.textContent = this.add.textContent; }
      const mobilePrice = this.querySelector('[data-mobile-price]');
      if (mobilePrice) mobilePrice.textContent = variant ? money(variant.price) : 'Unavailable';
      this.querySelector('[data-availability]').textContent = !variant ? 'This combination is unavailable.' : variant.available ? 'Available' : 'Sold out';
      if (!variant) { this.select.value = ''; this.querySelector('[data-product-price]').textContent = 'Choose another combination'; return; }
      this.select.value = variant.id;
      const price = this.querySelector('[data-product-price]'); price.replaceChildren(el('span', {}, money(variant.price)));
      if (variant.compare_at_price > variant.price) price.append(' ', el('s', {}, money(variant.compare_at_price)));
      const sku = this.querySelector('[data-sku]'); sku.hidden = !variant.sku; sku.textContent = variant.sku ? `SKU: ${variant.sku}` : '';
      const qty = this.form.elements.quantity; qty.min = variant.quantity_rule?.min || 1; qty.step = variant.quantity_rule?.increment || 1;
      if (variant.quantity_rule?.max) qty.max = variant.quantity_rule.max; else qty.removeAttribute('max');
      if (Number(qty.value) < Number(qty.min)) qty.value = qty.min;
      this.closest('.product-layout')?.querySelector('product-gallery')?.show(variant.featured_media?.id || variant.featured_image?.id);
      if (updateURL && this.closest('.product-section')) { const url = new URL(location.href); url.searchParams.set('variant', variant.id); history.replaceState({}, '', url); }
    }
    checkUpload(input) {
      const file = input.files[0]; const error = C.validateUpload(file, Number(input.dataset.maxMb));
      input.setCustomValidity(error); this.querySelector('[data-upload-error]').textContent = error;
      const preview = this.querySelector('[data-upload-preview]'); if (this.uploadURL) URL.revokeObjectURL(this.uploadURL); preview.hidden = !!error || !file;
      if (!error && file) { this.uploadURL = URL.createObjectURL(file); preview.src = this.uploadURL; }
      return !error;
    }
    async submit(event) {
      const error = this.querySelector('[data-form-error]'); error.textContent = '';
      const upload = this.querySelector('[data-upload]');
      if (upload && !this.checkUpload(upload)) { event.preventDefault(); upload.reportValidity(); return; }
      if (!this.variant?.available) { event.preventDefault(); error.textContent = 'Please choose an available gift option.'; return; }
      if (upload?.files.length) return; // Shopify's native multipart upload persists the file URL with the line item.
      event.preventDefault(); if (this.busy || !this.form.reportValidity()) return;
      this.busy = true; this.add.disabled = true; this.add.textContent = 'Adding your gift…'; if (this.mobileButton) { this.mobileButton.disabled = true; this.mobileButton.textContent = 'Adding…'; }
      try {
        const data = new FormData(this.form);
        [...data.keys()].filter(key => this.form.elements[key]?.type === 'file').forEach(key => data.delete(key));
        data.set('sections', 'cart-drawer'); data.set('sections_url', location.pathname);
        const result = await request(`${root}cart/add.js`, { method: 'POST', body: data });
        try { await refreshCart(result.sections?.['cart-drawer']); openDialog('CartDrawer'); } catch { location.assign(`${root}cart`); }
        status('Your gift was added to the bag.');
      } catch (failure) { error.textContent = failure.message; }
      finally { this.busy = false; this.add.disabled = !this.variant?.available; this.add.textContent = this.variant?.available ? 'Add to gift bag' : 'Sold out'; if (this.mobileButton) { this.mobileButton.disabled = this.add.disabled; this.mobileButton.textContent = this.add.textContent; } }
    }
    disconnectedCallback() { this.purchaseObserver?.disconnect(); if (this.uploadURL) URL.revokeObjectURL(this.uploadURL); }
  }
  customElements.define('product-form', ProductForm);

  let cartBusy = false;
  function showCartError(error) { document.querySelectorAll('[data-cart-error]').forEach(target => target.textContent = error.message); status(error.message); }
  async function refreshCart(html) {
    if (!html) { const sections = await request(`${root}?sections=cart-drawer`); html = sections['cart-drawer']; }
    if (!html) throw new Error('Your bag could not refresh. Open the full cart page to review your gifts.');
    document.querySelectorAll('[data-cart-content]').forEach((container, index) => {
      const template = document.createElement('template'); template.innerHTML = html;
      const ids = new Map();
      template.content.querySelectorAll('[id]').forEach(node => { const id = node.id; node.id = `${id}-view-${index}`; ids.set(id, node.id); });
      template.content.querySelectorAll('[for],[aria-controls],[aria-describedby],[aria-labelledby]').forEach(node => {
        for (const attr of ['for', 'aria-controls', 'aria-describedby', 'aria-labelledby']) {
          if (node.hasAttribute(attr)) node.setAttribute(attr, node.getAttribute(attr).split(' ').map(id => ids.get(id) || id).join(' '));
        }
      });
      container.replaceChildren(template.content);
    });
    const cart = await request(`${root}cart.js`);
    document.querySelectorAll('[data-cart-count]').forEach(node => node.textContent = cart.item_count);
    document.querySelectorAll('[data-cart-error]').forEach(node => node.textContent = '');
    return cart;
  }
  async function updateLine(key, quantity) {
    if (cartBusy) return;
    if (!Number.isSafeInteger(quantity) || quantity < 0) { showCartError(new Error('Please enter a valid quantity.')); return; }
    cartBusy = true; document.querySelectorAll('[data-cart-content]').forEach(node => { node.classList.add('loading'); node.setAttribute('aria-busy', 'true'); });
    const focusedLabel = document.activeElement?.getAttribute('data-cart-quantity');
    try {
      const result = await jsonPost(`${root}cart/change.js`, { id: key, quantity, sections: ['cart-drawer'], sections_url: location.pathname });
      await refreshCart(result.sections?.['cart-drawer']); status('Your gift bag has been updated.');
      if (focusedLabel) [...document.querySelectorAll('[data-cart-quantity]')].find(input => input.dataset.cartQuantity === focusedLabel)?.focus();
    } catch (error) { showCartError(error); }
    finally { cartBusy = false; document.querySelectorAll('[data-cart-content]').forEach(node => { node.classList.remove('loading'); node.removeAttribute('aria-busy'); }); }
  }
  document.addEventListener('change', event => { if (event.target.matches('[data-cart-quantity]')) updateLine(event.target.dataset.cartQuantity, Number(event.target.value)); });
  document.addEventListener('submit', async event => {
    if (!event.target.matches('[data-cart-form]')) return;
    const form = event.target;
    if (!event.submitter?.matches('[name="checkout"]')) return; // Native update submit is a reliable no-JS fallback.
    event.preventDefault(); if (cartBusy) return; cartBusy = true;
    const button = event.submitter; button.disabled = true; button.textContent = 'Preparing checkout…';
    try {
      const updates = {};
      form.querySelectorAll('[data-cart-quantity]').forEach(input => { if (!input.checkValidity()) throw new Error('Please check your gift quantities.'); updates[input.dataset.cartQuantity] = Number(input.value); });
      await jsonPost(`${root}cart/update.js`, { updates, note: form.querySelector('[name="note"]').value });
      const handoff = document.createElement('form'); handoff.method = 'post'; handoff.action = `${root}cart`;
      const checkout = el('input', { type: 'hidden', name: 'checkout', value: 'Checkout' }); handoff.append(checkout); document.body.append(handoff); handoff.submit();
    } catch (error) { showCartError(error); cartBusy = false; button.disabled = false; button.textContent = 'Continue to checkout'; }
  });

  class PredictiveSearch extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input[type=search]'); this.results = this.querySelector('[data-results]');
      this.input.addEventListener('input', () => { clearTimeout(this.timer); this.abort?.abort(); this.timer = setTimeout(() => this.search(), 250); });
      this.addEventListener('keydown', event => {
        const links = [...this.results.querySelectorAll('[role=option]')];
        if (event.key === 'Escape') { this.results.replaceChildren(); this.input.setAttribute('aria-expanded', 'false'); this.input.removeAttribute('aria-activedescendant'); this.activeIndex = -1; this.input.focus(); event.stopPropagation(); }
        if (['ArrowDown', 'ArrowUp'].includes(event.key) && links.length) {
          event.preventDefault(); const index = this.activeIndex ?? -1;
          this.activeIndex = index === -1 ? (event.key === 'ArrowDown' ? 0 : links.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
          links.forEach((link, i) => { link.setAttribute('aria-selected', String(i === this.activeIndex)); link.classList.toggle('is-active', i === this.activeIndex); });
          this.input.setAttribute('aria-activedescendant', links[this.activeIndex].id); links[this.activeIndex].scrollIntoView({ block: 'nearest' }); this.input.focus();
        }
        if (event.key === 'Enter' && this.activeIndex >= 0 && links[this.activeIndex]) { event.preventDefault(); location.assign(links[this.activeIndex].href); }
      });
    }
    async search() {
      const term = this.input.value.trim(); this.activeIndex = -1; this.input.removeAttribute('aria-activedescendant'); if (!term) { this.results.replaceChildren(); this.input.setAttribute('aria-expanded', 'false'); return; }
      this.abort = new AbortController(); this.results.textContent = 'Finding thoughtful gifts…';
      try {
        const url = `${root}search/suggest?q=${encodeURIComponent(term)}&resources[type]=product,collection,query&resources[limit]=6&section_id=predictive-search`;
        const response = await fetch(url, { signal: this.abort.signal }); if (!response.ok) throw new Error('Search suggestions are unavailable. Press Enter to see all results.');
        this.results.innerHTML = await response.text(); this.activeIndex = -1; this.input.removeAttribute('aria-activedescendant'); this.results.querySelectorAll('[role=option]').forEach((link, index) => link.id = `SearchSuggestion-${index}`); this.input.setAttribute('aria-expanded', 'true');
      } catch (error) { if (error.name !== 'AbortError') { this.results.textContent = error.message; this.input.setAttribute('aria-expanded', 'false'); } }
    }
    disconnectedCallback() { clearTimeout(this.timer); this.abort?.abort(); }
  }
  customElements.define('predictive-search', PredictiveSearch);

  class WishlistList extends HTMLElement {
    connectedCallback() { this.render(); }
    async render() {
      const run = this.run = (this.run || 0) + 1;
      this.replaceChildren();
      if (!saved.length) { this.append(el('h3', {}, 'A little inspiration, saved for later.'), el('p', {}, 'Tap the heart on a gift to keep it here.'), el('a', { href: `${root}collections/all`, class: 'button' }, 'Find a thoughtful gift')); return; }
      this.append(el('p', {}, 'Loading your saved gifts…'));
      const results = await Promise.all(saved.map(async handle => { try { return { handle, product: await request(`${root}products/${encodeURIComponent(handle)}.js`) }; } catch { return { handle, product: null }; } }));
      if (run !== this.run || !this.isConnected) return;
      this.replaceChildren();
      results.forEach(({ handle, product }) => {
        const item = el('article', { class: 'wishlist-item' });
        if (product?.featured_image) item.append(el('img', { src: product.featured_image, alt: product.title, width: '90', height: '110', loading: 'lazy' }));
        const details = el('div'); const title = el('h3');
        if (product) title.append(el('a', { href: `${root}products/${handle}` }, product.title)); else title.textContent = 'This gift is currently unavailable.';
        details.append(title);
        if (product) details.append(el('p', {}, money(product.price)), el('a', { href: `${root}products/${handle}`, class: 'text-link' }, 'Choose your gift →'));
        details.append(el('button', { type: 'button', class: 'text-button', 'data-wishlist': handle, 'aria-pressed': 'true' }, 'Remove from wishlist'));
        item.append(details); this.append(item);
      });
    }
  }
  customElements.define('wishlist-list', WishlistList);

  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      if (this.querySelector('.product-card')) return;
      this.observer = new IntersectionObserver(async entries => { if (!entries[0].isIntersecting) return; this.observer.disconnect(); try { const response = await fetch(this.dataset.url); if (!response.ok) return; const doc = new DOMParser().parseFromString(await response.text(), 'text/html'); const content = doc.querySelector('product-recommendations'); if (content?.querySelector('.product-card')) { this.innerHTML = content.innerHTML; syncHearts(); } } catch { /* Recommendations are optional. */ } }, { rootMargin: '300px' }); this.observer.observe(this);
    }
    disconnectedCallback() { this.observer?.disconnect(); }
  }
  customElements.define('product-recommendations', ProductRecommendations);
  class GiftCountdown extends HTMLElement {
    connectedCallback() { const end = Date.parse(this.dataset.end); if (!Number.isFinite(end) || !/(Z|[+-]\d{2}:\d{2})$/.test(this.dataset.end)) { if (window.Shopify?.designMode) this.querySelector('[data-countdown-error]').hidden = false; return; } const update = () => { const diff = end - Date.now(); if (diff <= 0) { this.querySelector('[data-countdown]').textContent = 'This offer has ended.'; clearInterval(this.timer); return; } const seconds = Math.floor(diff / 1000); this.querySelector('[data-countdown]').textContent = `${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s remaining`; }; update(); if (end > Date.now()) this.timer = setInterval(update, 1000); }
    disconnectedCallback() { clearInterval(this.timer); }
  }
  customElements.define('gift-countdown', GiftCountdown);

  class GiftBoxBuilder extends HTMLElement {
    connectedCallback() {
      if (this.ready) return; this.ready = true;
      this.catalog = JSON.parse(this.querySelector('[data-builder-catalog]').textContent);
      this.min = Number(this.dataset.min); this.max = Number(this.dataset.max);
      this.key = `wrapnwhim-box-${this.dataset.sectionId}`;
      this.draft = this.readDraft(); this.step = 0;
      this.error = this.querySelector('[data-builder-error]');
      this.querySelector('[data-builder-shell]').hidden = false;
      this.renderOptions();
      this.querySelector('[data-builder-back]').addEventListener('click', () => { this.step = Math.max(0, this.step - 1); this.render(); this.focusStep(); });
      this.querySelector('[data-builder-next]').addEventListener('click', () => { try { this.validateStep(); this.step = Math.min(5, this.step + 1); this.error.textContent = ''; this.render(); this.focusStep(); } catch (error) { this.error.textContent = error.message; } });
      this.querySelector('[data-builder-add]').addEventListener('click', () => this.addBox());
      this.querySelector('[data-builder-reset]').addEventListener('click', () => { this.draft = { box: null, items: {}, wrapping: null, card: null, name: '', message: '', occasion: '' }; this.step = 0; this.save(); this.renderOptions(); this.render(); this.focusStep(); });
      for (const key of ['name', 'message', 'occasion']) { const input = this.querySelector(`[data-builder-${key}]`); input.value = this.draft[key] || ''; input.addEventListener('input', () => { this.draft[key] = input.value; this.save(); }); }
      this.render();
    }
    readDraft() {
      let value; try { value = JSON.parse(sessionStorage.getItem(this.key)); } catch { /* Storage can be unavailable. */ }
      const clean = { box: null, items: {}, wrapping: null, card: null, name: '', message: '', occasion: '' };
      if (!value || typeof value !== 'object') return clean;
      for (const role of ['box', 'wrapping', 'card']) { const products = role === 'box' ? [this.catalog.box] : role === 'wrapping' ? this.catalog.wrapping : [this.catalog.card]; const product = products.filter(Boolean).find(p => p.eligible !== false && p.variants.some(v => Number(v.id) === Number(value[role]) && v.available)); const variant = product?.variants.find(v => Number(v.id) === Number(value[role])); if (variant) clean[role] = variant.id; }
      for (const [id, quantity] of Object.entries(value.items || {})) { const found = C.findVariant(this.catalog, id); if (found?.variant.available && this.catalog.items.includes(found.product) && Number.isSafeInteger(quantity) && quantity > 0) clean.items[id] = Math.min(quantity, this.max); }
      for (const key of ['name', 'message', 'occasion']) clean[key] = typeof value[key] === 'string' ? value[key].slice(0, key === 'message' ? 300 : 60) : '';
      return clean;
    }
    save() { try { sessionStorage.setItem(this.key, JSON.stringify(this.draft)); } catch { status('Your box selections will be kept only while this page is open.'); } }
    image(product) { return product.image ? el('img', { src: product.image, alt: product.title, width: '480', height: '480', loading: 'lazy' }) : null; }
    option(product, variant, role) {
      const label = el('label', { class: 'builder-option' });
      const radio = el('input', { type: 'radio', name: `builder-${this.dataset.sectionId}-${role}`, value: variant?.id || '', ...(variant?.available === false || product?.eligible === false ? { disabled: '' } : {}) });
      radio.checked = variant ? Number(this.draft[role]) === Number(variant.id) : !this.draft[role];
      radio.addEventListener('change', () => { this.draft[role] = variant?.id || null; this.save(); this.render(); });
      label.append(radio);
      const image = product && this.image(product); if (image) label.append(image);
      label.append(el('strong', {}, product ? product.title : role === 'wrapping' ? 'No additional wrapping' : 'No greeting card'));
      if (variant) label.append(el('small', {}, `${variant.title === 'Default Title' ? '' : variant.title + ' · '}${money(variant.price)}${variant.available ? '' : ' · Sold out'}`));
      return label;
    }
    renderOptions() {
      const boxes = this.querySelector('[data-box-options]'); boxes.replaceChildren();
      this.catalog.box.variants.forEach(variant => boxes.append(this.option(this.catalog.box, variant, 'box')));
      const wraps = this.querySelector('[data-wrapping-options]'); wraps.replaceChildren(this.option(null, null, 'wrapping'));
      this.catalog.wrapping.forEach(product => product.variants.forEach(variant => wraps.append(this.option(product, variant, 'wrapping'))));
      const cards = this.querySelector('[data-card-options]'); cards.replaceChildren(this.option(null, null, 'card'));
      this.catalog.card?.variants.forEach(variant => cards.append(this.option(this.catalog.card, variant, 'card')));
      const items = this.querySelector('[data-item-options]'); items.replaceChildren();
      this.catalog.items.forEach(product => {
        const card = el('article', { class: 'builder-item' }); const image = this.image(product); if (image) card.append(image);
        card.append(el('h3', {}, product.title));
        if (product.eligible === false) { card.append(el('a', { href: product.url, class: 'text-link' }, 'Personalize this gift on its product page →')); items.append(card); return; }
        const select = el('select', { 'aria-label': `Choose an option for ${product.title}` });
        product.variants.forEach(variant => { const option = el('option', { value: variant.id, ...(variant.available ? {} : { disabled: '' }) }, `${variant.title === 'Default Title' ? product.title : variant.title} · ${money(variant.price)}${variant.available ? '' : ' · Sold out'}`); if (this.draft.items[variant.id]) option.selected = true; select.append(option); });
        if (!product.variants.some(v => v.available)) { card.append(el('p', {}, 'Currently sold out')); items.append(card); return; }
        // Prefer the first available variant when the restored value is absent.
        if (!product.variants.find(v => v.id === Number(select.value))?.available) select.value = product.variants.find(v => v.available).id;
        card.append(select);
        const control = el('div', { class: 'quantity-control' });
        const minus = el('button', { type: 'button', 'aria-label': `Remove one ${product.title}` }, '−');
        const qty = el('input', { type: 'number', min: '0', max: String(this.max), step: '1', value: this.draft.items[select.value] || '0', 'aria-label': `Quantity of ${product.title}`, 'data-builder-item': product.id });
        const plus = el('button', { type: 'button', 'aria-label': `Add one ${product.title}` }, '+');
        let currentId = select.value;
        select.addEventListener('change', () => { currentId = select.value; qty.value = this.draft.items[currentId] || 0; });
        const change = value => {
          const totalOthers = Object.entries(this.draft.items).reduce((sum, [id, quantity]) => sum + (id === currentId ? 0 : quantity), 0);
          if (!Number.isSafeInteger(value) || value < 0 || totalOthers + value > this.max) { this.error.textContent = `This box can hold up to ${this.max} gift items.`; qty.value = this.draft.items[currentId] || 0; return; }
          if (value) this.draft.items[currentId] = value; else delete this.draft.items[currentId];
          qty.value = value; this.error.textContent = ''; this.save(); this.render();
        };
        minus.addEventListener('click', () => change(Math.max(0, Number(qty.value) - 1)));
        plus.addEventListener('click', () => change(Number(qty.value) + 1));
        qty.addEventListener('change', () => change(Number(qty.value)));
        control.append(minus, qty, plus); card.append(control); items.append(card);
      });
    }
    validateStep() {
      if (!this.draft.box && this.step === 0) throw new Error('Choose an available box to continue.');
      if (this.step >= 1) C.validateBuilder(this.catalog, this.draft, this.min, this.max);
    }
    line(line) {
      const row = el('div', { class: 'builder-line' }); const image = this.image(line.product); if (image) row.append(image);
      const title = el('span', {}, `${line.quantity} × ${line.product.title}`); title.append(el('small', {}, `${line.role}${line.variant.title !== 'Default Title' ? ' · ' + line.variant.title : ''}`));
      row.append(title, el('strong', {}, money(line.quantity * line.variant.price))); return row;
    }
    render() {
      this.querySelectorAll('[data-step]').forEach((panel, index) => panel.hidden = index !== this.step);
      this.querySelectorAll('[data-step-indicator]').forEach((item, index) => { item.classList.toggle('complete', index < this.step); if (index === this.step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current'); });
      this.querySelector('[data-builder-back]').hidden = this.step === 0;
      this.querySelector('[data-builder-next]').hidden = this.step === 5;
      this.querySelector('[data-builder-add]').hidden = this.step !== 5;
      const count = Object.values(this.draft.items).reduce((sum, value) => sum + value, 0); this.querySelector('[data-item-count]').textContent = `${count} of ${this.max} items selected`;
      const summary = this.querySelector('[data-builder-summary]'); const review = this.querySelector('[data-builder-review]'); summary.replaceChildren(); review.replaceChildren();
      try {
        const selected = C.builderSelection(this.catalog, this.draft);
        selected.forEach(line => { summary.append(this.line(line)); review.append(this.line(line)); });
        this.querySelector('[data-builder-total]').textContent = money(C.builderTotal(this.catalog, this.draft));
        if (this.draft.name) review.append(el('p', {}, `For: ${this.draft.name}`));
        if (this.draft.message) review.append(el('p', {}, `Your message: ${this.draft.message}`));
        if (this.draft.occasion) review.append(el('p', {}, `Occasion: ${this.draft.occasion}`));
      } catch (error) { this.error.textContent = error.message; this.querySelector('[data-builder-total]').textContent = 'Please review selections'; }
    }
    focusStep() { this.querySelector(`[data-step="${this.step}"] h2`)?.focus(); }
    async addBox() {
      if (this.busy) return;
      const button = this.querySelector('[data-builder-add]');
      this.busy = true; button.disabled = true; button.textContent = 'Checking your gifts…'; this.error.textContent = '';
      try {
        const selected = C.validateBuilder(this.catalog, this.draft, this.min, this.max);
        const beforeTotal = C.builderTotal(this.catalog, this.draft);
        const live = await Promise.all([...new Set(selected.map(line => line.product.handle))].map(handle => request(`${root}products/${encodeURIComponent(handle)}.js`)));
        const updated = new Map(live.map(p => [p.handle, p]));
        for (const product of [this.catalog.box, ...this.catalog.items, ...this.catalog.wrapping, this.catalog.card].filter(Boolean)) {
          const latest = updated.get(product.handle); if (!latest) continue;
          product.variants.forEach(variant => { const fresh = latest.variants.find(v => v.id === variant.id); variant.available = !!fresh?.available; if (fresh) { variant.price = fresh.price; variant.min = fresh.quantity_rule?.min || 1; variant.max = fresh.quantity_rule?.max || null; variant.increment = fresh.quantity_rule?.increment || 1; } });
        }
        const newTotal = C.builderTotal(this.catalog, this.draft);
        // Server inventory enforcement remains authoritative even after a live availability check.
        if (newTotal !== beforeTotal) { this.render(); throw new Error('A price has changed. Review the updated total, then add your box again.'); }
        const reference = `WNW-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        const lines = C.builderLines(this.catalog, this.draft, reference, this.min, this.max);
        const result = await jsonPost(`${root}cart/add.js`, { items: lines, sections: ['cart-drawer'], sections_url: location.pathname });
        try { await refreshCart(result.sections?.['cart-drawer']); } catch { location.assign(`${root}cart`); }
        try { sessionStorage.removeItem(this.key); } catch { /* No persistent draft to remove. */ }
        openDialog('CartDrawer'); status('Your configured gift box was added to the bag.');
      } catch (error) { this.error.textContent = error.message; this.render(); }
      finally { this.displayedTotal = (() => { try { return C.builderTotal(this.catalog, this.draft); } catch { return undefined; } })(); this.busy = false; button.disabled = false; button.textContent = 'Add this gift box'; }
    }
  }
  customElements.define('gift-box-builder', GiftBoxBuilder);

  document.querySelectorAll('[data-country-select]').forEach(select => {
    const update = () => { const province = document.getElementById(select.dataset.provinceId); const pairs = JSON.parse(select.selectedOptions[0]?.dataset.provinces || '[]'); province.replaceChildren(); pairs.forEach(([value, label]) => province.append(el('option', { value }, label))); province.disabled = !pairs.length; if (province.dataset.default) province.value = province.dataset.default; };
    select.value = select.dataset.default; update(); select.addEventListener('change', update);
  });
  // Keep native details usable without JavaScript; collapse only the mobile filter panel.
  const desktopCatalog = matchMedia('(min-width: 990px)');
  function initCatalogFilters(scope = document) {
    scope.querySelectorAll('[data-catalog-filters]').forEach(panel => {
      if (panel.dataset.initialized) return;
      panel.dataset.initialized = 'true'; panel.open = desktopCatalog.matches;
    });
  }
  desktopCatalog.addEventListener('change', () => {
    document.querySelectorAll('[data-catalog-filters]').forEach(panel => panel.open = desktopCatalog.matches);
  });
  document.addEventListener('shopify:section:load', event => { syncHearts(); initCatalogFilters(event.target); });
  initCatalogFilters();
  syncHearts();
})();
