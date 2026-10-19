/* Layout-specific behavior; native source UI and offline actions remain in use. */
(() => {
  'use strict';
  const page = document.querySelector('.good-page--client-layout');
  if (!page) return;
  const productHeading = page.querySelector('h1.good-page__description-title');
  const stickyTitle = document.querySelector('.good-page__header-title');
  if (productHeading && stickyTitle) {
    const syncStickyTitle = () => {
      const title = productHeading.textContent.trim();
      if (stickyTitle.textContent !== title) stickyTitle.textContent = title;
    };
    syncStickyTitle();
    new MutationObserver(syncStickyTitle).observe(productHeading, {childList:true, subtree:true, characterData:true});
  }
  // Independent columns avoid holes below shorter specification cards.
  const specifications = page.querySelector('#characteristics .client-grouped-specs');
  if (specifications) {
    const cards = [...specifications.querySelectorAll(':scope > .client-spec-group')];
    const twoSpecColumns = window.matchMedia('(min-width:701px)');
    function arrangeSpecifications() {
      specifications.replaceChildren(...cards);
      if (!twoSpecColumns.matches) return;
      const columns = [document.createElement('div'), document.createElement('div')];
      columns.forEach(column => { column.className = 'client-spec-column'; });
      cards.filter(card => !card.classList.contains('client-spec-group-wide')).forEach((card, index) => columns[index % 2].append(card));
      specifications.prepend(...columns);
    }
    twoSpecColumns.addEventListener('change', arrangeSpecifications);
    arrangeSpecifications();
  }
  const warranty = page.querySelector('.client-warranty');
  const promotions = page.querySelector('.product_stocks .badges');
  if (promotions) {
    const badges = [...promotions.querySelectorAll('.badge:not(.badges-arrow)')];
    const all = promotions.querySelector('.client-all-promos');
    function fitPromotions() {
      if (!promotions.clientWidth || !all) return;
      badges.forEach(badge => badge.classList.remove('client-promo-overflow'));
      let visible = badges.length;
      const rowCount = () => {
        let rows = 0, bottom = -Infinity;
        for (const item of [...badges.slice(0, visible), all]) {
          const rect = item.getBoundingClientRect();
          if (rect.top >= bottom - 1) rows++;
          bottom = Math.max(bottom, rect.bottom);
        }
        return rows;
      };
      while (visible && rowCount() > 2) {
        badges[--visible].classList.add('client-promo-overflow');
      }
    }
    let previousWidth;
    new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width !== previousWidth) { previousWidth = width; fitPromotions(); }
    }).observe(promotions);
    document.fonts.ready.then(fitPromotions);
    window.addEventListener('load', fitPromotions);
    fitPromotions();
  }
  document.addEventListener('click', event => {
    if (warranty && !warranty.contains(event.target)) warranty.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && warranty?.open) {
      warranty.open = false;
      warranty.querySelector('summary').focus();
    }
  });
  const content = page.querySelector('.good-page__content');
  const purchase = page.querySelector('.good-page__description');
  const parameters = page.querySelector('.client-parameters-column');
  const priceCard = page.querySelector('.client-price-card');
  const mainBuying = page.querySelector('.good-page__buying');
  const compactLayout = window.matchMedia('(max-width: 1599px)');
  const mobileLayout = window.matchMedia('(max-width: 700px)');
  const productMeta = page.querySelector('.client-product-meta');
  const galleryColumn = page.querySelector('.client-gallery-column');
  const productRating = page.querySelector('.client-rating');
  const productActions = page.querySelector('.good-page__action-data');
  const stockState = priceCard.querySelector('.client-stock');
  const allSpecifications = parameters.querySelector('.client-all-specs');
  const mobilePriceHeader = document.createElement('div');
  mobilePriceHeader.className = 'client-price-header';
  // Original anchors restore the existing desktop DOM after a mobile resize.
  const desktopSlots = [productMeta, productHeading, parameters, productRating,
    productActions, stockState, allSpecifications].map(node => {
    const anchor = document.createComment('mobile layout restore point');
    node.before(anchor);
    return {node, anchor};
  });
  let wasMobile = false;
  document.body.classList.add('client-product-responsive');
  function arrangeProduct() {
    if (mobileLayout.matches) {
      content.insertBefore(productMeta, galleryColumn);
      content.insertBefore(productHeading, galleryColumn);
      content.insertBefore(productRating, galleryColumn);
      purchase.prepend(parameters);
      priceCard.insertBefore(mobilePriceHeader, priceCard.querySelector('.good-page__price-info'));
      mobilePriceHeader.append(productActions);
      priceCard.insertBefore(stockState, mainBuying);
      parameters.append(allSpecifications);
      wasMobile = true;
      return;
    }
    if (wasMobile) {
      desktopSlots.forEach(({node, anchor}) => anchor.after(node));
      mobilePriceHeader.remove();
      wasMobile = false;
    }
    // Keep the original compact/tablet and three-column desktop behavior.
    if (compactLayout.matches) {
      const target = priceCard.querySelector('.client-payment-options');
      if (parameters.parentElement !== priceCard || parameters.nextElementSibling !== target) priceCard.insertBefore(parameters, target);
    } else if (parameters.parentElement !== content) {
      content.insertBefore(parameters, purchase);
    }
    priceCard.insertBefore(stockState, mainBuying);
  }
  compactLayout.addEventListener('change', arrangeProduct);
  mobileLayout.addEventListener('change', arrangeProduct);
  arrangeProduct();

  // Sticky gallery applies only to the two-column desktop layout.
  const stickyGalleryLayout = window.matchMedia('(min-width:701px) and (max-width:1599px)');
  const siteHeader = document.querySelector('.header');
  const mainHeader = document.getElementById('head');
  const priceHeader = page.querySelector('.good-page__header');
  const headerTopBars = [...siteHeader.querySelectorAll(':scope > .header__top')];
  let navigationFrame;
  function positionNavigation() {
    navigationFrame = null;
    if (!stickyGalleryLayout.matches) return;
    const topHeight = headerTopBars.reduce((total, bar) => total + bar.getBoundingClientRect().height, 0);
    const value = Math.max(0, topHeight - window.scrollY) + 'px';
    if (document.body.style.getPropertyValue('--client-nav-shift') !== value) document.body.style.setProperty('--client-nav-shift', value);
  }
  function sizeGalleryOffset() {
    if (!stickyGalleryLayout.matches) {
      ['--client-nav-height', '--client-header-height', '--client-nav-shift'].forEach(name => document.body.style.removeProperty(name));
      page.style.removeProperty('--client-gallery-top');
      priceHeader.classList.remove('client-header-dismissed');
      return;
    }
    const navigationHeight = mainHeader.getBoundingClientRect().height;
    const topHeight = headerTopBars.reduce((total, bar) => total + bar.getBoundingClientRect().height, 0);
    document.body.style.setProperty('--client-nav-height', navigationHeight + 'px');
    document.body.style.setProperty('--client-header-height', (topHeight + navigationHeight) + 'px');
    const value = Math.ceil(navigationHeight + priceHeader.getBoundingClientRect().height + 16) + 'px';
    if (page.style.getPropertyValue('--client-gallery-top') !== value) page.style.setProperty('--client-gallery-top', value);
    positionNavigation();
  }
  const galleryHeaderObserver = new ResizeObserver(sizeGalleryOffset);
  [mainHeader, priceHeader, ...headerTopBars].forEach(header => galleryHeaderObserver.observe(header));
  window.addEventListener('scroll', () => {
    if (stickyGalleryLayout.matches && !navigationFrame) navigationFrame = requestAnimationFrame(positionNavigation);
  }, {passive:true});
  stickyGalleryLayout.addEventListener('change', sizeGalleryOffset);
  priceHeader.querySelector('.good-page__header-close').addEventListener('click', event => {
    if (!stickyGalleryLayout.matches) return;
    event.preventDefault();
    event.stopPropagation();
    priceHeader.classList.add('client-header-dismissed');
  });
  sizeGalleryOffset();

  // The mobile CTA delegates to the original purchase control.
  const mobilePurchase = document.createElement('div');
  mobilePurchase.className = 'client-mobile-purchase';
  mobilePurchase.hidden = true;
  mobilePurchase.setAttribute('role', 'region');
  mobilePurchase.setAttribute('aria-label', 'Покупка товара');
  mobilePurchase.innerHTML = '<button type="button" class="client-mobile-warranty" aria-haspopup="dialog"></button><div class="client-mobile-purchase-row"><strong class="client-mobile-purchase-price"></strong><button type="button" class="btn btn--dark client-mobile-purchase-buy">Купить</button></div>';
  const mobileWarranty = mobilePurchase.querySelector('.client-mobile-warranty');
  mobileWarranty.innerHTML = warranty.querySelector('summary').innerHTML;
  mobileWarranty.addEventListener('click', () => {
    window.samsungOffline.show('Официальная гарантия Samsung', warranty.querySelector('.client-warranty-popover').innerHTML, 'client-installment-dialog client-warranty-dialog');
  });
  document.body.append(mobilePurchase);
  mobilePurchase.querySelector('.client-mobile-purchase-buy').addEventListener('click', () => {
    page.querySelector('.client-cart-button button').click();
  });
  new ResizeObserver(() => {
    const height = Math.ceil(mobilePurchase.getBoundingClientRect().height);
    if (height && document.body.style.getPropertyValue('--client-purchase-height') !== height + 'px') {
      document.body.style.setProperty('--client-purchase-height', height + 'px');
    }
  }).observe(mobilePurchase);
  let purchaseFrame;
  let observedBottomMenu;
  const bottomMenuObserver = new ResizeObserver(() => updateMobilePurchase());
  function updateMobilePurchase() {
    if (purchaseFrame) return;
    purchaseFrame = requestAnimationFrame(() => {
      purchaseFrame = null;
      const bottomMenu = document.querySelector('.bottom_menu');
      if (bottomMenu !== observedBottomMenu) {
        if (observedBottomMenu) bottomMenuObserver.unobserve(observedBottomMenu);
        if (bottomMenu) bottomMenuObserver.observe(bottomMenu);
        observedBottomMenu = bottomMenu;
      }
      const menu = bottomMenu?.getBoundingClientRect();
      const menuHeight = menu && menu.width && menu.bottom > 0 && menu.top < innerHeight && getComputedStyle(bottomMenu).visibility !== 'hidden' ? Math.max(0, innerHeight - menu.top) : 0;
      const menuOffset = menuHeight + 'px';
      if (document.body.style.getPropertyValue('--client-bottom-menu-height') !== menuOffset) document.body.style.setProperty('--client-bottom-menu-height', menuOffset);
      const safeInset = menuHeight ? '0px' : 'env(safe-area-inset-bottom)';
      if (mobilePurchase.style.getPropertyValue('--client-purchase-safe-inset') !== safeInset) mobilePurchase.style.setProperty('--client-purchase-safe-inset', safeInset);
      const cookie = document.querySelector('#block-cookie-form')?.getBoundingClientRect();
      const cookieHeight = cookie && cookie.width && cookie.bottom > 0 && cookie.top < innerHeight ? Math.max(0, innerHeight - cookie.top) : 0;
      const modalOpen = !!document.querySelector('dialog[open]') || [...document.querySelectorAll('.ui-widget-overlay, #cboxOverlay')].some(el => el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden');
      const keyboardOpen = window.visualViewport && window.visualViewport.height < innerHeight * .75;
      const coveredBottom = Math.max(menuHeight, cookieHeight);
      const hidden = !mobileLayout.matches || modalOpen || keyboardOpen;
      if (mobilePurchase.hidden !== !!hidden) mobilePurchase.hidden = !!hidden;
      const offset = coveredBottom + 'px';
      if (mobilePurchase.style.bottom !== offset) mobilePurchase.style.bottom = offset;
      const price = page.querySelector('.good-page__price-current .price__current').textContent.trim();
      if (mobilePurchase.querySelector('strong').textContent !== price) mobilePurchase.querySelector('strong').textContent = price;
      const original = page.querySelector('.client-cart-button button');
      mobilePurchase.querySelector('.client-mobile-purchase-buy').disabled = original.disabled;
      if (mobileLayout.matches && cookieNotice?.getAnimations({subtree: true}).some(animation => animation.playState === 'running')) updateMobilePurchase();
    });
  }
  const cookieNotice = document.querySelector('#block-cookie-form');
  if (cookieNotice) {
    new ResizeObserver(updateMobilePurchase).observe(cookieNotice);
    ['transitionrun', 'transitionend', 'animationstart', 'animationend'].forEach(event => cookieNotice.addEventListener(event, updateMobilePurchase));
  }
  new MutationObserver(records => {
    if (records.some(record => !mobilePurchase.contains(record.target))) updateMobilePurchase();
  }).observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['open', 'style', 'class', 'hidden', 'disabled']});
  window.addEventListener('scroll', updateMobilePurchase, {passive: true});
  window.addEventListener('resize', updateMobilePurchase);
  window.visualViewport?.addEventListener('resize', updateMobilePurchase);
  mobileLayout.addEventListener('change', updateMobilePurchase);
  updateMobilePurchase();

  // Keep the desktop preview rail and swipe between photos on mobile.
  const gallery = page.querySelector('.product-gallery');
  const galleryImage = page.querySelector('.product-gallery__image');
  const thumbs = [...page.querySelectorAll('.product-gallery__nav-item a')];
  function currentPhoto() {
    const active = thumbs.findIndex(thumb => thumb.parentElement.classList.contains('product-gallery__nav-item--active'));
    return active < 0 ? 0 : active;
  }
  let photoTransition = false;
  const reducedPhotoMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function movePhoto(direction) {
    if (photoTransition) return;
    const index = Math.max(0, Math.min(thumbs.length - 1, currentPhoto() + direction));
    if (index === currentPhoto()) return;
    const photo = galleryImage.querySelector('.product-gallery__image-product');
    const animate = mobileLayout.matches && !reducedPhotoMotion.matches;
    const outgoing = animate ? photo.cloneNode() : null;
    if (outgoing) {
      outgoing.className = 'client-gallery-outgoing';
      outgoing.setAttribute('aria-hidden', 'true');
      galleryImage.append(outgoing);
      photoTransition = true;
    }
    thumbs[index]?.click();
    if (outgoing) {
      const timing = {duration:280, easing:'cubic-bezier(.22,1,.36,1)', fill:'both'};
      const animations = [
        outgoing.animate([{transform:'translateX(0)'}, {transform:`translateX(${-direction * 100}%)`}], timing),
        photo.animate([{transform:`translateX(${direction * 100}%)`}, {transform:'translateX(0)'}], timing)
      ];
      Promise.all(animations.map(animation => animation.finished)).catch(() => {}).finally(() => {
        outgoing.remove();
        animations.forEach(animation => animation.cancel());
        photoTransition = false;
      });
    }
  }
  let touchStart, suppressPhotoClick = false;
  galleryImage.addEventListener('touchstart', event => {
    const touch = event.touches[0];
    touchStart = {x: touch.clientX, y: touch.clientY};
    suppressPhotoClick = false;
  }, {passive: true});
  galleryImage.addEventListener('touchend', event => {
    if (!mobileLayout.matches || !touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x, dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      event.preventDefault();
      suppressPhotoClick = true;
      movePhoto(dx < 0 ? 1 : -1);
    }
  }, {passive: false});
  galleryImage.addEventListener('click', event => {
    if (suppressPhotoClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressPhotoClick = false; }
  }, true);
  function sizePreviewRail() {
    if (mobileLayout.matches) return;
    const height = galleryImage.getBoundingClientRect().height;
    if (!height) return;
    const value = height + 'px';
    if (gallery.style.getPropertyValue('--client-photo-height') !== value) {
      gallery.style.setProperty('--client-photo-height', value);
      const nav = window.jQuery(gallery).find('.product-gallery__nav');
      if (nav.hasClass('slick-initialized')) nav.slick('setPosition');
    }
  }
  new ResizeObserver(sizePreviewRail).observe(galleryImage);
  function configureGallery() {
    const $ = window.jQuery;
    const nav = $('.good-page--client-layout .product-gallery__nav');
    if (!nav.hasClass('slick-initialized')) return;
    if (nav[0].dataset.clientVertical === 'true') { sizePreviewRail(); nav.slick('setPosition'); return; }
    nav[0].dataset.clientVertical = 'true';
    sizePreviewRail();
    const options = Object.assign({}, nav.slick('getSlick').originalSettings, {
      vertical: true,
      verticalSwiping: true,
      slidesToShow: 5,
      slidesToScroll: 1,
      arrows: true,
      dots: false,
      infinite: false,
      appendArrows: nav,
      prevArrow: '<button type="button" class="arrow-top" aria-label="Предыдущие фото"></button>',
      nextArrow: '<button type="button" class="arrow-down" aria-label="Следующие фото"></button>',
      responsive: [
        { breakpoint: 480, settings: { slidesToShow: 4, slidesToScroll: 1, vertical: true, verticalSwiping: true } }
      ]
    });
    nav.slick('unslick');
    nav.slick(options);
    nav.slick('setPosition');
    nav.find('a').each(function () {
      this.setAttribute('aria-label', 'Показать фото ' + (Number(this.dataset.productGalleryItem ?? this.dataset.galleryItem) + 1));
    });
  }
  window.jQuery('.good-page--client-layout .product-gallery__nav').one('init.clientLayout', () => setTimeout(configureGallery, 0));
  window.addEventListener('load', configureGallery);
  let resizing;
  window.addEventListener('resize', () => {
    clearTimeout(resizing);
    resizing = setTimeout(configureGallery, 150);
  });
  page.addEventListener('click', e => {
    const thumb = e.target.closest('.product-gallery__nav-item a');
    if (thumb) page.querySelector('.product-gallery__image').dataset.item = thumb.dataset.productGalleryItem ?? thumb.dataset.galleryItem;
  });
  const escape = value => String(value).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  document.addEventListener('click', e => {
    const control = e.target.closest('[data-client-action],[data-client-tab]');
    if (!control || !page.contains(control)) return;
    e.preventDefault();e.stopImmediatePropagation();
    const ui = window.samsungOffline;
    if (control.dataset.clientTab) {
      ui.selectTab(control.dataset.clientTab);
      const tabs = control.dataset.clientTarget
        ? document.getElementById(control.dataset.clientTarget)
        : page.querySelector('.bookmark__tabs-list');
      if (!tabs) return;
      if (control.dataset.clientTarget && warranty) warranty.open = false;
      const fixedHeader = document.querySelector('.good-page__header');
      let offset = 0;
      if (fixedHeader) {
        const previousStyle = fixedHeader.getAttribute('style');
        fixedHeader.style.visibility = 'hidden';
        fixedHeader.style.display = 'block';
        offset = fixedHeader.getBoundingClientRect().height;
        if (previousStyle === null) fixedHeader.removeAttribute('style');
        else fixedHeader.setAttribute('style', previousStyle);
      }
      window.scrollTo({top: Math.max(0, window.scrollY + tabs.getBoundingClientRect().top - offset - 12), behavior:control.dataset.clientTarget ? 'instant' : 'smooth'});
      // The native bar fills its content after scrolling and can change height.
      let corrected = false;
      const correctPosition = () => {
        if (corrected) return;
        corrected = true;
        window.removeEventListener('scrollend', correctPosition);
        const headerBottom = fixedHeader && getComputedStyle(fixedHeader).display !== 'none'
          ? fixedHeader.getBoundingClientRect().bottom : 0;
        window.scrollBy({top: tabs.getBoundingClientRect().top - headerBottom - 12, behavior:'instant'});
        if (control.dataset.clientTarget) tabs.focus({preventScroll:true});
      };
      if (!control.dataset.clientTarget) window.addEventListener('scrollend', correctPosition, {once:true});
      setTimeout(correctPosition, 800);
      return;
    }
    switch (control.dataset.clientAction) {
      case 'share': {
        const url = 'https://online-samsung.ru/product/sm-f976bzkbcau';
        const modal = ui.show('Поделиться', `<label>Ссылка на товар<input type="url" readonly value="${url}" aria-label="Ссылка на товар"></label><button class="btn btn--dark" type="button" data-copy-product-link>Скопировать ссылку</button><p role="status"></p>`, 'client-installment-dialog');
        modal.querySelector('[data-copy-product-link]').onclick = async () => {
          const input = modal.querySelector('input');
          let copied = false;
          try { await navigator.clipboard.writeText(url); copied = true; } catch {
            input.select();
            copied = document.execCommand('copy');
          }
          modal.querySelector('[role=status]').textContent = copied ? 'Ссылка скопирована' : 'Выделите и скопируйте ссылку';
        };
        break;
      }
      case 'installment': {
        const priceText = page.querySelector('.good-page__price-current .price__current').textContent;
        const price = Number(priceText.replace(/\D/g, ''));
        const money = value => Math.ceil(value).toLocaleString('ru-RU') + ' ₽';
        const modal = ui.show('Рассрочка', `
          <div class="client-installment-price"><span>Цена товара</span><strong>${money(price)}</strong></div>
          <div class="client-installment-title" id="installment-term-label">Выберите срок рассрочки</div>
          <div class="client-installment-terms" role="group" aria-labelledby="installment-term-label">
            ${[6,12,18,24,36].map(term => `<button type="button" data-installment-term="${term}" aria-pressed="${term === 24}">${term} мес</button>`).join('')}
          </div>
          <div class="client-installment-result" aria-live="polite" aria-atomic="true"><span>Ежемесячный платёж</span><strong data-installment-payment>${money(price / 24)}</strong><div data-installment-duration>на <b>24</b> месяца</div></div>
          <div class="client-installment-note"><i class="client-icon" aria-hidden="true">&#xf05a;</i><span>Предварительный расчёт. Точные условия и одобрение банк определит при оформлении заказа.</span></div>
          <div class="client-installment-actions"><a class="btn btn--dark" href="https://online-samsung.ru/product/sm-f976bzkbcau" target="_blank" rel="noopener">Оформить рассрочку</a><button type="button" class="btn btn--outline" data-installment-close>Закрыть</button></div>
        `, 'client-installment-dialog');
        modal.querySelectorAll('[data-installment-term]').forEach(button => button.addEventListener('click', () => {
          const term = Number(button.dataset.installmentTerm);
          modal.querySelectorAll('[data-installment-term]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
          modal.querySelector('[data-installment-payment]').textContent = money(price / term);
          modal.querySelector('[data-installment-duration]').innerHTML = `на <b>${term}</b> ${term === 24 ? 'месяца' : 'месяцев'}`;
        }));
        modal.querySelector('[data-installment-close]').onclick = () => modal.close();
        break;
      }
      case 'split': {
        const price = Number(page.querySelector('.good-page__price-current .price__current').textContent.replace(/\D/g, ''));
        const money = value => value.toLocaleString('ru-RU', {maximumFractionDigits: 2}) + ' ₽';
        ui.show('Яндекс Сплит', `
          <div class="client-split-intro">
            <i class="client-split-icon" aria-hidden="true">&#xf09d;</i>
            <h3>2 месяца без переплат</h3>
            <p>Первый платёж сейчас — ${money(price / 2)}, второй через месяц</p>
          </div>
          <dl class="client-split-summary">
            <div><dt>Цена товара</dt><dd>${money(price)}</dd></div>
            <div><dt>Первый платёж</dt><dd>${money(price / 2)}</dd></div>
          </dl>
          <div class="client-installment-actions client-split-actions"><a class="btn btn--dark" href="https://online-samsung.ru/product/sm-f976bzkbcau" target="_blank" rel="noopener">Выбрать Сплит при оформлении</a></div>
        `, 'client-installment-dialog client-split-dialog');
        break;
      }
      case 'promotions': {
        const promotions = [...page.querySelectorAll('.product_stocks .badge .tooltip')];
        const captions = {
          'z-fold-8-z-flip-8': 'Специальная выгода при покупке смартфона.',
          '646': 'Покупка по программе трейд-ин.',
          'vygodnaya-pokupka': 'Предложение на второе устройство.',
          'kiber-vyhodnye': 'Предложение по использованию бонусов.'
        };
        const cards = promotions.map(link => {
          const title = link.closest('.badge').querySelector('.tooltip_text')?.textContent.trim()
            || [...link.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
          const slug = new URL(link.href).pathname.split('/').filter(Boolean).pop();
          const caption = captions[slug] || 'Условия и сроки — на странице акции.';
          return `<article class="client-promotion-card"><h3>${escape(title)}</h3><p>${escape(caption)}</p><a href="${escape(link.href)}" target="_blank" rel="noopener">Подробнее <span aria-hidden="true">→</span></a></article>`;
        }).join('');
        ui.show('Все акции', `<div class="client-promotions-list">${cards}</div>`, 'client-installment-dialog client-promotions-dialog');
        break;
      }
      case 'delivery':
      case 'pickup': {
        const pickup = control.dataset.clientAction === 'pickup';
        const template = document.getElementById(pickup ? 'client-pickup-content' : 'client-courier-content');
        const modal = ui.show(template.dataset.title, template.innerHTML, 'client-installment-dialog client-fulfillment-dialog');
        modal.querySelector('[data-client-modal-map]')?.addEventListener('click', () => {
          modal.close();
          ui.selectTab('availability_stores');
          page.querySelector('#availability_stores').scrollIntoView({behavior:'smooth', block:'start'});
          page.querySelector('.shop-list__switch-button--map')?.click();
        });
        break;
      }
      case 'more-accessories': {
        const panel = page.querySelector('#accessories');
        const expanded = panel.classList.toggle('client-accessories-expanded');
        control.textContent = expanded ? 'Свернуть аксессуары' : 'Показать ещё аксессуары';
        control.setAttribute('aria-expanded', String(expanded));
        break;
      }
    }
  }, true);
  document.addEventListener('keydown', e => {
    const control = e.target.closest('[data-client-action][role="button"]');
    if (control && (e.key === 'Enter' || e.key === ' ')) {e.preventDefault();control.click();}
  });
})();
