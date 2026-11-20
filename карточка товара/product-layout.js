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
  const warrantySummary = warranty.querySelector('summary');
  function preserveModalGutter() {
    const root = document.documentElement;
    const scrollGap = Math.max(0, innerWidth - root.getBoundingClientRect().width);
    root.style.setProperty('--client-modal-scroll-gap', `${scrollGap}px`);
  }
  function showMobileWarranty() {
    preserveModalGutter();
    window.samsungOffline.show('Официальная гарантия Samsung', warranty.querySelector('.client-warranty-popover').innerHTML, 'client-warranty-dialog');
  }
  document.addEventListener('click', event => {
    if (warranty && !warranty.contains(event.target)) warranty.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && warranty?.open) {
      warranty.open = false;
      warrantySummary.focus();
    }
  });
  const mobileLayout = window.matchMedia('(max-width: 700px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const overview = page.querySelector('.good-page__content');
  const mainBuying = overview.querySelector('.good-page__buying');
  const footer = document.querySelector('[data-home-footer]');
  const showPurchaseOnScroll = (headerBottom, footerLimit) =>
    mainBuying.getBoundingClientRect().bottom <= headerBottom &&
    (!footer || footer.getBoundingClientRect().top >= footerLimit);

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealItems = page.querySelectorAll('#features #stream-container, #characteristics .client-spec-group, #accessories .catalog__grid-item, #reviews_ratings .reviews-ratings__item, #product_faq .client-faq-list');
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('client-content-visible');
        observer.unobserve(entry.target);
      }
    }, {threshold:0.06, rootMargin:'0px 0px -18px 0px'});
    for (const item of revealItems) {
      if (item.getClientRects().length && item.getBoundingClientRect().top < innerHeight) continue;
      item.classList.add('client-content-reveal');
      observer.observe(item);
    }
  }

  // Keep the native single-open FAQ and animate the height between its two states.
  let faqMotion;
  reducedMotion.addEventListener('change', event => {
    if (event.matches) faqMotion?.animation.finish();
  });
  for (const item of page.querySelectorAll('.client-faq-item')) {
    const summary = item.querySelector('summary');
    summary.setAttribute('aria-expanded', String(item.open));
    item.addEventListener('toggle', () => {
      if (faqMotion?.item !== item) summary.setAttribute('aria-expanded', String(item.open));
    });
    summary.addEventListener('click', event => {
      if (reducedMotion.matches) {
        summary.setAttribute('aria-expanded', String(!item.open));
        return;
      }
      event.preventDefault();
      if (faqMotion && faqMotion.item !== item) faqMotion.animation.finish();
      const from = item.getBoundingClientRect().height;
      const open = faqMotion?.item === item ? !faqMotion.open : !item.open;
      faqMotion?.animation.cancel();
      item.open = false;
      const closedHeight = item.getBoundingClientRect().height;
      item.open = true;
      const to = open ? item.getBoundingClientRect().height : closedHeight;
      summary.setAttribute('aria-expanded', String(open));
      const animation = item.animate([{height: `${from}px`}, {height: `${to}px`}], {
        duration: 180,
        easing: 'cubic-bezier(.22,1,.36,1)'
      });
      faqMotion = {item, open, animation};
      animation.onfinish = () => {
        if (faqMotion?.animation !== animation) return;
        item.open = open;
        faqMotion = null;
      };
    });
  }

  // Keep the purchase bar below the visible portion of the site header.
  const homeChrome = document.querySelector('[data-home-chrome]');
  const siteHeader = homeChrome.querySelector('.site-header');
  const priceHeader = page.querySelector('.good-page__header');
  function positionHomeHeader() {
    const visible = Math.max(0, siteHeader.getBoundingClientRect().bottom);
    const priceHeight = priceHeader.getBoundingClientRect().height;
    const priceBottom = visible + priceHeight;
    const show = !mobileLayout.matches && showPurchaseOnScroll(visible, priceBottom) &&
      !priceHeader.classList.contains('client-header-dismissed');
    priceHeader.classList.toggle('scrolled', show);
    priceHeader.inert = !show;
    const sectionTop = Math.ceil(show ? priceBottom : visible);
    document.body.style.setProperty('--client-nav-height', visible + 'px');
    document.body.style.setProperty('--client-section-top', sectionTop + 'px');
    page.style.setProperty('--client-gallery-top', sectionTop + 16 + 'px');
  }
  let navigationFrame;
  const galleryHeaderObserver = new ResizeObserver(positionHomeHeader);
  [homeChrome, priceHeader, mainBuying, page].forEach(element => galleryHeaderObserver.observe(element));
  window.addEventListener('scroll', () => {
    if (navigationFrame) return;
    navigationFrame = requestAnimationFrame(() => {
      navigationFrame = null;
      positionHomeHeader();
    });
  }, {passive:true});
  mobileLayout.addEventListener('change', positionHomeHeader);
  priceHeader.querySelector('.good-page__header-close').addEventListener('click', event => {
    event.preventDefault();
    priceHeader.classList.add('client-header-dismissed');
    positionHomeHeader();
  });
  positionHomeHeader();

  // Keep the mobile purchase controls in view and reserve space below the page.
  const mobileDock = document.querySelector('.client-mobile-dock');
  const mobilePurchase = document.createElement('div');
  mobilePurchase.className = 'client-mobile-purchase';
  mobilePurchase.setAttribute('role', 'region');
  mobilePurchase.setAttribute('aria-label', 'Покупка товара');
  mobilePurchase.innerHTML = '<button type="button" class="client-mobile-warranty" aria-haspopup="dialog"></button><div class="client-mobile-purchase-row"><strong class="client-mobile-purchase-price"></strong><button type="button" class="btn btn--dark client-mobile-purchase-buy">Купить</button></div>';
  const mobileWarranty = mobilePurchase.querySelector('.client-mobile-warranty');
  mobileWarranty.innerHTML = warrantySummary.innerHTML;
  mobileWarranty.addEventListener('click', showMobileWarranty);
  warrantySummary.addEventListener('click', event => {
    if (!mobileLayout.matches) return;
    event.preventDefault();
    showMobileWarranty();
  });
  const mainPrice = overview.querySelector('.good-page__price-current .price__current');
  const mainBuy = mainBuying.querySelector('.client-cart-button button');
  const mobilePrice = mobilePurchase.querySelector('.client-mobile-purchase-price');
  const mobileBuy = mobilePurchase.querySelector('.client-mobile-purchase-buy');
  function syncMobilePurchase() {
    mobilePrice.textContent = mainPrice.textContent.trim();
    mobileBuy.disabled = mainBuy.disabled;
  }
  function updateMobileDockVisibility() {
    const keyboardOpen = window.visualViewport && window.visualViewport.height < innerHeight * .75;
    mobileDock.hidden = !!keyboardOpen;
  }
  function updateWarrantyTrigger() {
    if (mobileLayout.matches) warrantySummary.setAttribute('aria-haspopup', 'dialog');
    else warrantySummary.removeAttribute('aria-haspopup');
  }
  syncMobilePurchase();
  updateWarrantyTrigger();
  updateMobileDockVisibility();
  mobileDock.prepend(mobilePurchase);
  const purchaseObserver = new MutationObserver(syncMobilePurchase);
  purchaseObserver.observe(mainPrice, {subtree: true, childList: true, characterData: true});
  purchaseObserver.observe(mainBuy, {attributes: true, attributeFilter: ['disabled']});
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--client-mobile-dock-height', `${mobileDock.offsetHeight}px`);
  }).observe(mobileDock);
  window.visualViewport?.addEventListener('resize', updateMobileDockVisibility);
  mobileLayout.addEventListener('change', updateWarrantyTrigger);

  // Keep the desktop preview rail and swipe between photos on mobile.
  const gallery = page.querySelector('.product-gallery');
  const galleryImage = page.querySelector('.product-gallery__image');
  const thumbs = [...page.querySelectorAll('.product-gallery__nav-item a')];
  function currentPhoto() {
    const active = thumbs.findIndex(thumb => thumb.parentElement.classList.contains('product-gallery__nav-item--active'));
    return active < 0 ? 0 : active;
  }
  function movePhoto(direction) {
    const current = currentPhoto();
    const next = Math.max(0, Math.min(thumbs.length - 1, current + direction));
    if (next !== current) selectPhoto(next);
  }
  function swipeDirection(start, end, minDistance = 45) {
    const dx = end.clientX - start.clientX;
    const dy = end.clientY - start.clientY;
    if (Math.abs(dx) <= minDistance || Math.abs(dx) <= Math.abs(dy) * 1.3) return 0;
    return dx < 0 ? 1 : -1;
  }
  for (const track of page.querySelectorAll('#stream-container .sc-11 > .sc-1')) {
    const slides = [...track.parentElement.querySelectorAll(':scope > input[type="radio"]')];
    let start;
    track.addEventListener('touchstart', event => {
      start = event.touches.length === 1 ? event.touches[0] : null;
    }, {passive: true});
    track.addEventListener('touchend', event => {
      if (!start) return;
      const direction = swipeDirection(start, event.changedTouches[0], 30);
      start = null;
      if (!direction) return;
      const selected = slides.findIndex(slide => slide.checked);
      if (selected >= 0) slides[(selected + direction + slides.length) % slides.length].checked = true;
    }, {passive: true});
    track.addEventListener('touchcancel', () => { start = null; });
  }
  let touchStart, suppressPhotoClick = false;
  galleryImage.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? event.touches[0] : null;
    suppressPhotoClick = false;
  }, {passive: true});
  galleryImage.addEventListener('touchend', event => {
    if (!mobileLayout.matches || !touchStart) return;
    const direction = swipeDirection(touchStart, event.changedTouches[0]);
    touchStart = null;
    if (direction) {
      event.preventDefault();
      suppressPhotoClick = true;
      movePhoto(direction);
    }
  }, {passive: false});
  galleryImage.addEventListener('click', event => {
    if (suppressPhotoClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressPhotoClick = false; }
  }, true);
  const rail = gallery.querySelector('.client-gallery-rail');
  const prevPhotos = gallery.querySelector('.client-gallery-arrow--prev');
  const nextPhotos = gallery.querySelector('.client-gallery-arrow--next');
  const photo = galleryImage.querySelector('.product-gallery__image-product');
  const motion = () => reducedMotion.matches ? 'instant' : 'smooth';
  function updateRailArrows() {
    prevPhotos.disabled = rail.scrollTop < 1;
    nextPhotos.disabled = rail.scrollTop + rail.clientHeight >= rail.scrollHeight - 1;
  }
  new ResizeObserver(updateRailArrows).observe(rail);
  updateRailArrows();
  rail.addEventListener('scroll', updateRailArrows, {passive:true});
  for (const [button, direction] of [[prevPhotos, -1], [nextPhotos, 1]]) {
    button.addEventListener('click', () => {
      rail.scrollBy({top: direction * thumbs[0].parentElement.getBoundingClientRect().height, behavior: motion()});
    });
  }
  let photoFade;
  function selectPhoto(index) {
    const thumb = thumbs[index];
    if (!thumb) return;
    const changed = galleryImage.dataset.item !== String(index);
    thumbs.forEach((item, i) => {
      item.parentElement.classList.toggle('product-gallery__nav-item--active', i === index);
      if (i === index) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
    photo.src = thumb.href;
    galleryImage.href = thumb.href;
    galleryImage.dataset.item = String(index);
    if (changed && !reducedMotion.matches) {
      photo.decode().then(() => {
        if (galleryImage.dataset.item !== String(index) || reducedMotion.matches) return;
        photoFade?.cancel();
        photoFade = photo.animate([{opacity:.25}, {opacity:1}], {duration:430, easing:'cubic-bezier(.22,1,.36,1)'});
      }).catch(() => {});
    }
  }
  thumbs.forEach((thumb, index) => thumb.addEventListener('click', event => {
    event.preventDefault();
    selectPhoto(index);
  }));

  const galleryDialog = document.createElement('dialog');
  galleryDialog.className = 'offline-dialog client-gallery-dialog';
  galleryDialog.setAttribute('aria-label', 'Фотографии товара');
  galleryDialog.innerHTML = `
    <header class="client-gallery-view-header">
      <h2 class="client-gallery-view-model"></h2>
      <p class="client-gallery-view-variant"></p>
    </header>
    <button type="button" class="offline-close" aria-label="Закрыть фото" autofocus>×</button>
    <div class="client-gallery-view-stage">
      <img class="client-gallery-view-image" alt="Фото товара">
    </div>
    <div class="client-gallery-view-controls">
      <button type="button" class="client-gallery-view-prev" aria-label="Предыдущее фото">←</button>
      <div class="client-gallery-view-thumbnails" role="group" aria-label="Миниатюры фотографий"></div>
      <button type="button" class="client-gallery-view-next" aria-label="Следующее фото">→</button>
    </div>
    <p class="client-gallery-view-count" aria-live="polite"></p>`;
  document.body.append(galleryDialog);

  const zoomStage = galleryDialog.querySelector('.client-gallery-view-stage');
  const zoomPhoto = galleryDialog.querySelector('.client-gallery-view-image');
  const zoomCounter = galleryDialog.querySelector('.client-gallery-view-count');
  const zoomRail = galleryDialog.querySelector('.client-gallery-view-thumbnails');
  const zoomThumbs = thumbs.map((thumb, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'client-gallery-view-thumb';
    button.setAttribute('aria-label', `Показать фото ${index + 1}`);
    const image = document.createElement('img');
    image.alt = '';
    image.loading = 'lazy';
    image.src = thumb.querySelector('img')?.src || thumb.href;
    button.append(image);
    button.addEventListener('click', () => chooseZoomPhoto(index));
    return button;
  });
  zoomRail.append(...zoomThumbs);
  let zoomBounds, zoomFade;
  let zoomIndex = 0;
  let zoomRequest = 0;

  function updateZoomHeading() {
    const title = productHeading.textContent.trim().replace(/\s+\d+\s*(?:ГБ|ТБ)(?:\s.*)?$/iu, '');
    const memory = page.querySelector('.good-page__memory-list input:checked');
    const storage = memory?.labels?.[0]?.textContent.trim().replace(/(?:ГБ|ТБ)$/iu, unit => unit.toUpperCase());
    const color = page.querySelector('.good-page__colors-list input:checked')?.getAttribute('aria-label');
    galleryDialog.querySelector('.client-gallery-view-model').textContent = title;
    galleryDialog.querySelector('.client-gallery-view-variant').textContent = [storage, color].filter(Boolean).join(', ');
  }

  function revealZoomThumb(behavior) {
    const selected = zoomRail.querySelector('[aria-current="true"]');
    if (!selected || !zoomRail.clientWidth) return;
    const left = selected.offsetLeft;
    const right = left + selected.offsetWidth;
    if (left < zoomRail.scrollLeft) zoomRail.scrollTo({left, behavior});
    else if (right > zoomRail.scrollLeft + zoomRail.clientWidth) {
      zoomRail.scrollTo({left: right - zoomRail.clientWidth, behavior});
    }
  }

  function fitZoomPhoto() {
    if (!galleryDialog.open) return;
    zoomPhoto.style.transform = '';
    if (!zoomBounds) return;
    const [width, height, left, top, right, bottom] = zoomBounds;
    const {clientWidth, clientHeight} = zoomPhoto;
    // Fit the visible artwork instead of including the transparent canvas in its margins.
    const containScale = Math.min(clientWidth / width, clientHeight / height);
    const scale = Math.min(clientWidth * .94 / (right - left), clientHeight * .91 / (bottom - top));
    if (!containScale || !scale) return;
    const x = (width - left - right) * scale / 2;
    const y = (height - top - bottom) * scale / 2;
    zoomPhoto.style.transform = `translate(${x}px, ${y}px) scale(${scale / containScale})`;
  }

  function renderZoomPhoto(index, behavior) {
    const thumb = thumbs[index];
    zoomBounds = thumb.dataset.zoomBounds?.split(' ').map(Number);
    zoomPhoto.src = thumb.href;
    zoomPhoto.alt = `Фото товара ${index + 1}`;
    zoomCounter.textContent = `${index + 1} / ${thumbs.length}`;
    zoomRail.querySelector('[aria-current="true"]')?.removeAttribute('aria-current');
    zoomThumbs[index].setAttribute('aria-current', 'true');
    revealZoomThumb(behavior);
    fitZoomPhoto();
  }

  async function chooseZoomPhoto(index) {
    if (index === zoomIndex) return;
    zoomIndex = index;
    const request = ++zoomRequest;
    const preload = new Image();
    preload.src = thumbs[index].href;
    await preload.decode().catch(() => {});
    if (!galleryDialog.open || request !== zoomRequest) return;
    selectPhoto(index);
    renderZoomPhoto(index, motion());
    zoomFade?.cancel();
    if (!reducedMotion.matches) {
      zoomFade = zoomPhoto.animate([{opacity:.25}, {opacity:1}], {duration:430, easing:'cubic-bezier(.22,1,.36,1)'});
    }
  }

  function stepZoomPhoto(direction) {
    chooseZoomPhoto((zoomIndex + direction + thumbs.length) % thumbs.length);
  }

  new ResizeObserver(fitZoomPhoto).observe(zoomPhoto);
  new ResizeObserver(() => revealZoomThumb('instant')).observe(zoomRail);
  let zoomTouchStart;
  zoomStage.addEventListener('touchstart', event => {
    zoomTouchStart = event.touches.length === 1 ? event.touches[0] : null;
  }, {passive: true});
  zoomStage.addEventListener('touchend', event => {
    if (!zoomTouchStart) return;
    const direction = swipeDirection(zoomTouchStart, event.changedTouches[0]);
    zoomTouchStart = null;
    if (direction) stepZoomPhoto(direction);
  }, {passive: true});
  zoomStage.addEventListener('touchcancel', () => { zoomTouchStart = null; });
  galleryDialog.querySelector('.offline-close').addEventListener('click', () => galleryDialog.close());
  galleryDialog.querySelector('.client-gallery-view-prev').addEventListener('click', () => stepZoomPhoto(-1));
  galleryDialog.querySelector('.client-gallery-view-next').addEventListener('click', () => stepZoomPhoto(1));
  galleryDialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    stepZoomPhoto(event.key === 'ArrowLeft' ? -1 : 1);
  });
  galleryDialog.addEventListener('click', event => {
    if (event.target !== galleryDialog) return;
    const {left, right, top, bottom} = galleryDialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) galleryDialog.close();
  });
  galleryImage.addEventListener('click', event => {
    event.preventDefault();
    if (galleryDialog.open) return;
    zoomRequest++;
    zoomFade?.cancel();
    zoomIndex = currentPhoto();
    updateZoomHeading();
    preserveModalGutter();
    galleryDialog.showModal();
    renderZoomPhoto(zoomIndex, 'instant');
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
        : page.querySelector('.bookmark');
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
      window.scrollTo({top: Math.max(0, window.scrollY + tabs.getBoundingClientRect().top - offset - 12), behavior:control.dataset.clientTarget ? 'instant' : motion()});
      // The native bar fills its content after scrolling and can change height.
      let corrected = false;
      const correctPosition = () => {
        if (corrected) return;
        corrected = true;
        window.removeEventListener('scrollend', correctPosition);
        const headerBottom = parseFloat(document.body.style.getPropertyValue('--client-section-top')) || 0;
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
            <img class="client-split-icon" src="assets/client-split-mark.svg" width="38" height="38" alt="">
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
        const promotions = [...page.querySelectorAll('.client-price-card .product_stocks .badge > a')];
        const captions = {
          'z-fold-8-z-flip-8': 'Специальная выгода при покупке смартфона.',
          '646': 'Покупка по программе трейд-ин.',
          'vygodnaya-pokupka': 'Предложение на второе устройство.',
          'kiber-vyhodnye': 'Предложение по использованию бонусов.'
        };
        const cards = promotions.map(link => {
          const title = [...link.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
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
