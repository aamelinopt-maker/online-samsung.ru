/* The local preview starts with an empty cart in each browser tab. */
(() => {
  'use strict';

  const storageKey = 'samsung-offline:cart';
  const maxQuantity = 10;
  const store = 'https://online-samsung.ru';
  const cartUrl = `${store}/cart`;
  const catalog = window.samsungChromeContent.products;
  const products = Object.values(catalog);
  const page = document.querySelector('.good-page--client-layout');
  const money = new Intl.NumberFormat('ru-RU');
  const format = amount => `${money.format(amount)} ₽`;
  const priceOf = text => Number(String(text ?? '').replace(/[^0-9]/g, ''));
  const isLocalImage = value => typeof value === 'string' && /^(?:assets|home-chrome\/assets)\/[\w.-]+$/.test(value);
  const normalize = text => text.toLocaleLowerCase('ru').replace('ультра', 'ultra').replace(/\s+/g, ' ');
  const phoneName = catalog.current.title.replace(/^Смартфон Samsung\s+/, '').replace(/\s+\d+\s*(?:ГБ|ТБ)(?:\s.*)?$/iu, '');

  function option(input) {
    if (!input) return '';
    const label = input.labels?.[0];
    return (input.getAttribute('aria-label') || label?.querySelector('[title]')?.title || label?.textContent || '').trim();
  }

  function phone() {
    const memory = page.querySelector('.good-page__memory-list input:checked');
    const color = page.querySelector('.good-page__colors-list input:checked');
    const extras = [...page.querySelectorAll('.client-configuration input:checked')];
    const storageLabel = option(memory).replace(/(?:ГБ|ТБ)$/iu, unit => unit.toLocaleUpperCase('ru'));
    const colorLabel = option(color);
    const variant = [storageLabel, colorLabel, ...extras.filter(input => !input.defaultChecked).map(option)].filter(Boolean).join(' · ');
    const model = normalize(phoneName);
    const match = products.find(product => {
      const name = normalize(product.title);
      return name.includes(model) && name.includes(normalize(storageLabel)) && name.endsWith(normalize(colorLabel));
    });
    const base = !memory || !color || (memory.defaultChecked && color.defaultChecked);
    const sku = base ? catalog.current.id : (match?.id || catalog.current.id);
    const selection = [memory?.value, color?.value, ...extras.map(input => input.value)].join('/');
    return {
      key: `${sku}/${selection}`,
      title: phoneName,
      variant,
      image: match?.image || catalog.current.image,
      url: match?.url || 'index.html',
      price: match && !base ? priceOf(match.price) : priceOf(page.querySelector('.good-page__price-current .price__current').textContent),
    };
  }

  const defaultPhone = phone();
  function catalogItem(product) {
    return {
      key: product.id,
      title: product.title,
      variant: '',
      image: product.image,
      url: product.url,
      price: priceOf(product.price),
    };
  }

  function accessory(card) {
    const product = catalog[card.dataset.product];
    const item = catalogItem(product);
    const variant = card.querySelector('.home-preview-colors input:checked');
    const defaultVariant = !variant || variant.defaultChecked;
    return {...item, key: defaultVariant ? item.key : `${item.key}/${variant.value}`, variant: option(variant)};
  }

  function readCart() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(saved)) return [];
      const rows = new Map();
      for (const item of saved) {
        if (!item || typeof item.title !== 'string') continue;
        const product = products.find(entry => entry.title === item.title);
        let row;
        if (typeof item.key === 'string' && Number.isFinite(item.price) && item.price >= 0) {
          row = item;
        } else if (item.title === catalog.current.title) {
          row = defaultPhone;
        } else if (product) {
          row = catalogItem(product);
        } else {
          row = {key:item.title, title:item.title, variant:'', image:'', url:'', price:0};
        }
        const alreadySaved = rows.get(row.key);
        const quantity = Number.isInteger(item.quantity) ? Math.max(1, item.quantity) : 1;
        rows.set(row.key, {...row, quantity:Math.min(maxQuantity, (alreadySaved?.quantity || 0) + quantity)});
      }
      return [...rows.values()];
    } catch {
      return [];
    }
  }

  function storeLink(value) {
    try {
      const url = new URL(value);
      if (url.origin === store) return url.href;
    } catch {}
    return store;
  }

  const cart = readCart();

  const purchaseControls = [...document.querySelectorAll('.client-cart-button button, .clone-product-buy__submit-btn, .client-mobile-purchase-buy, #accessories button.product-teaser__add-to-cart')].map(control => {
    const label = control.querySelector('span') || control;
    return {control, label, initialLabel:label.textContent.trim(), initialHref:control.getAttribute('href'), card:control.closest('.product-teaser')};
  });

  function syncPurchaseControls() {
    const selected = phone().key;
    const added = new Set(cart.map(item => item.key));
    for (const {control, label, initialLabel, initialHref, card} of purchaseControls) {
      const inCart = added.has(card ? accessory(card).key : selected);
      const text = inCart ? 'Перейти в корзину' : initialLabel;
      if (label.textContent !== text) label.textContent = text;
      control.toggleAttribute('data-in-cart', inCart);
      if (initialHref !== null) control.href = inCart ? cartUrl : initialHref;
    }
  }

  const notice = document.createElement('aside');
  notice.className = 'client-cart-notice';
  notice.hidden = true;
  notice.setAttribute('aria-label', 'Добавление в корзину');
  notice.innerHTML = `
    <img class="c-cart-notice-image" alt="">
    <div>
      <p class="c-cart-notice-title"></p>
      <p class="c-cart-notice-message">
        <svg aria-hidden="true" class="icon"><use href="#hc-i-bag"></use></svg>
        <span>Добавлен в <a href="${cartUrl}">корзину</a></span>
      </p>
    </div>
    <button type="button" class="c-cart-notice-close" aria-label="Закрыть уведомление">×</button>`;
  const announcement = document.createElement('p');
  announcement.className = 'c-cart-status';
  announcement.setAttribute('role', 'status');
  document.body.append(notice, announcement);
  const noticeImage = notice.querySelector('img');
  const noticeTitle = notice.querySelector('.c-cart-notice-title');
  let noticeTimeout;
  let noticeTrigger;

  function hideNotice() {
    clearTimeout(noticeTimeout);
    if (notice.contains(document.activeElement)) noticeTrigger?.focus({preventScroll:true});
    notice.hidden = true;
  }

  function scheduleNotice() {
    clearTimeout(noticeTimeout);
    if (!notice.hidden && !notice.matches(':hover, :focus-within')) {
      noticeTimeout = setTimeout(hideNotice, 10000);
    }
  }

  function showNotice(item, trigger) {
    noticeTrigger = trigger;
    noticeTitle.textContent = [item.title, item.variant].filter(Boolean).join(' · ');
    noticeImage.hidden = !isLocalImage(item.image);
    if (!noticeImage.hidden) noticeImage.src = item.image;
    notice.hidden = false;
    announcement.textContent = `${noticeTitle.textContent} добавлен в корзину.`;
    scheduleNotice();
  }

  notice.querySelector('.c-cart-notice-close').addEventListener('click', hideNotice);
  for (const event of ['mouseenter','mouseleave','focusin']) notice.addEventListener(event, scheduleNotice);
  notice.addEventListener('focusout', () => queueMicrotask(scheduleNotice));

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function save() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(cart)); } catch {}
    window.dispatchEvent(new CustomEvent('samsung-offline-change'));
  }

  function createPreview(trigger, index) {
    const wrapper = element('div', 'client-cart-anchor');
    const preview = element('div', 'client-mini-cart');
    preview.id = `client-mini-cart-${index + 1}`;
    preview.hidden = true;
    preview.innerHTML = `
      <div class="client-mini-cart-card" role="region" aria-label="Мини-корзина">
        <ul class="client-mini-cart-items"></ul>
        <div class="client-mini-cart-total"><span>Общая стоимость</span><strong></strong></div>
        <div class="client-mini-cart-actions"><a class="client-mini-cart-link" href="${cartUrl}">В корзину</a></div>
      </div>`;
    trigger.before(wrapper);
    wrapper.append(trigger, preview);
    trigger.href = cartUrl;
    trigger.removeAttribute('aria-haspopup');
    trigger.setAttribute('aria-controls', preview.id);
    trigger.setAttribute('aria-expanded', 'false');
    let closeTimeout;

    function closePreview() {
      clearTimeout(closeTimeout);
      preview.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }

    function openPreview() {
      clearTimeout(closeTimeout);
      if (!cart.length) return;
      preview.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
    }

    wrapper.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') openPreview();
    });
    wrapper.addEventListener('pointerleave', () => {
      clearTimeout(closeTimeout);
      closeTimeout = setTimeout(() => {
        if (!wrapper.contains(document.activeElement) && !wrapper.matches(':hover')) closePreview();
      }, 120);
    });
    wrapper.addEventListener('focusin', event => {
      if (event.target.matches(':focus-visible')) openPreview();
    });
    wrapper.addEventListener('focusout', event => {
      if (!wrapper.contains(event.relatedTarget) && !wrapper.matches(':hover')) closePreview();
    });
    wrapper.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || preview.hidden) return;
      event.preventDefault();
      trigger.focus();
      closePreview();
    });
    return {
      items:preview.querySelector('.client-mini-cart-items'),
      total:preview.querySelector('.client-mini-cart-total strong'),
      closePreview
    };
  }

  const previews = [...document.querySelectorAll('[data-home-chrome] [data-cart-open]')].map(createPreview);

  function renderMiniCart() {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    for (const preview of previews) {
      preview.items.replaceChildren(...cart.map(item => {
        const row = element('li', 'client-mini-cart-item');
        const link = element('a');
        link.href = item.url === 'index.html' ? 'index.html' : storeLink(item.url);
        if (isLocalImage(item.image)) {
          const picture = element('img');
          picture.src = item.image;
          picture.alt = '';
          link.append(picture);
        }
        link.append(element('span', '', [item.title, item.variant].filter(Boolean).join(' · ')));
        row.append(link);
        return row;
      }));
      preview.total.textContent = format(total);
      if (!cart.length) preview.closePreview();
    }
  }

  window.addEventListener('samsung-offline-change', syncPurchaseControls);
  window.addEventListener('samsung-offline-change', renderMiniCart);
  window.addEventListener('pageshow', () => requestAnimationFrame(syncPurchaseControls));
  document.addEventListener('samsung:variant-change', syncPurchaseControls);
  page.addEventListener('change', syncPurchaseControls);
  syncPurchaseControls();
  renderMiniCart();

  window.samsungCart = {
    getItems: () => cart.map(item => ({...item})),
    purchase(trigger) {
      const card = trigger.closest('.product-teaser');
      const item = card ? accessory(card) : phone();
      if (cart.some(saved => saved.key === item.key)) {
        location.assign(cartUrl);
        return;
      }
      cart.push({...item, quantity:1});
      save();
      showNotice(item, trigger);
    },
  };
})();
