/* Standalone page UI. No Drupal, jQuery, Slick or AJAX form bootstrapping. */
(() => {
  'use strict';
  const page = document.querySelector('.good-page');
  const nav = page.querySelector('.product-gallery__nav');
  const thumbs = [...nav.querySelectorAll('.product-gallery__nav-item a')];
  const photo = page.querySelector('.product-gallery__image-product');
  const frame = page.querySelector('.product-gallery__image');
  function imageFallback(image) {
    const local = image.dataset.localSrc;
    if (!local || image.src === new URL(local, location.href).href) return;
    image.closest('picture')?.querySelectorAll('source').forEach(source => source.removeAttribute('srcset'));
    image.removeAttribute('srcset'); image.src = local;
  }
  document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) imageFallback(event.target); }, true);
  document.querySelectorAll('img[data-local-src]').forEach(image => { if (image.complete && !image.naturalWidth) imageFallback(image); });
  const mobileMenu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.overlay-mobile-menu');
  function menu(open) {
    mobileMenu.classList.toggle('active', open);
    overlay.classList.toggle('active', open);
    document.body.classList.toggle('fixed', open);
    document.querySelector('.toggle_menu')?.setAttribute('aria-expanded', String(open));
  }
  function selectPhoto(thumb) {
    thumbs.forEach(el => {
      const active = el === thumb;
      el.parentElement.classList.toggle('product-gallery__nav-item--active', active);
      el.setAttribute('aria-current', String(active));
    });
    photo.dataset.localSrc = thumb.querySelector('img').dataset.localSrc || thumb.querySelector('img').getAttribute('src');
    photo.src = thumb.href;
    photo.removeAttribute('srcset');
    frame.dataset.item = thumb.dataset.productGalleryItem ?? thumb.dataset.galleryItem ?? String(thumbs.indexOf(thumb));
  }
  thumbs.forEach(thumb => thumb.addEventListener('click', e => { e.preventDefault(); selectPhoto(thumb); }));
  for (const [cls, direction] of [['arrow-top', -1], ['arrow-down', 1]]) {
    page.querySelector('.' + cls)?.addEventListener('click', () => {
      const height = nav.querySelector('.product-gallery__nav-item')?.getBoundingClientRect().height || 80;
      nav.scrollBy({top:direction * height * 3, behavior:'smooth'});
    });
  }
  // The map API is loaded by the map tab only; store coordinates come from the retained product data.
  window.initMapStores = () => {
    if (!window.ymaps || window.myMap) return;
    const host = document.getElementById('map-shops');
    const data = JSON.parse(document.getElementById('client-fulfillment-data').textContent);
    host.style.height = '400px';
    const map = window.myMap = new window.ymaps.Map(host, {center:[55.751244,37.618423],zoom:10,controls:['zoomControl','fullscreenControl']});
    const safe = value => String(value || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    for (const store of data.stock.stores) {
      const point = [Number(store.latitude),Number(store.longitude)];
      if (point.every(Number.isFinite)) map.geoObjects.add(new window.ymaps.Placemark(point, {balloonContentHeader:safe(store.name),balloonContentBody:safe(store.address),hintContent:safe(store.name)}));
    }
    map.container.fitToViewport();
  };
  const search = document.querySelector('.header__search-form');
  document.addEventListener('click', e => {
    const target = e.target;
    if (target.closest('.toggle_menu')) { e.preventDefault(); menu(!mobileMenu.classList.contains('active')); }
    if (target.closest('.mobile-menu__close,.overlay-mobile-menu')) { e.preventDefault(); menu(false); }
    const name = target.closest('.mobile-menu__item-name');
    if (name) {
      const parent = name.parentElement;
      const content = parent.querySelector(':scope > .mobile-menu__item-drops,:scope > .mobile-menu__item-drop-items');
      if (content) { e.preventDefault(); const open=!content.classList.contains('active');content.classList.toggle('active',open);parent.classList.toggle('active',open);name.classList.toggle('active',open); }
    }
    if (target.closest('.header__search') && !target.closest('.header__search-form')) { e.preventDefault();search.classList.toggle('active');if(search.classList.contains('active'))search.querySelector('input').focus(); }
    if (target.closest('.header__search-form-close')) { e.preventDefault();search.classList.remove('active'); }
    if (target.closest('.clone-product-buy__submit-btn')) { e.preventDefault();page.querySelector('.client-cart-button .btn').click(); }
    if (target.closest('.good-page__header-close')) { e.preventDefault();page.querySelector('.good-page__header').classList.add('client-header-dismissed'); }
    if (target.closest('.product-gallery__image,.product-gallery__popup-btn')) {
      e.preventDefault();const modal=window.samsungOffline.show('Фото товара','', 'client-gallery-dialog');
      const image=document.createElement('img');image.src=photo.currentSrc||photo.src;image.alt=photo.alt||'Фото товара';modal.querySelector('.offline-dialog-content').append(image);
    }
    const switcher=target.closest('.shop-list__switch-button');
    if(switcher){e.preventDefault();const map=switcher.classList.contains('shop-list__switch-button--map');document.querySelectorAll('.shop-list__switch-button').forEach(b=>b.classList.toggle('is-active',b===switcher));const wrap=document.querySelector('.offline-map-wrap');if(wrap)wrap.style.display=map?'block':'none';document.querySelector('.shop-list__table').style.display=map?'none':'';}
    const city=target.closest('.shop-list__choose-city-current');if(city){e.preventDefault();city.closest('.shop-list__choose-city').classList.toggle('expand');}
    const cityOption=target.closest('.shop-list__choose-city-dropdown-item a');if(cityOption){e.preventDefault();const group=cityOption.closest('.shop-list__choose-city');group.classList.remove('expand');group.querySelector('.shop-list__choose-city-current').textContent=cityOption.textContent;document.querySelectorAll('.shop-item').forEach(row=>row.classList.toggle('city-filtered',cityOption.dataset.city!=='all'&&row.dataset.cityName!==cityOption.dataset.city));}
  });
  document.addEventListener('keydown', e=>{if(e.key==='Escape'){menu(false);search.classList.remove('active');}});
  let tick;
  function scroll() {
    tick=null;
    const head=document.getElementById('head');
    const bars=[...document.querySelectorAll('.header > .header__top')].reduce((n,e)=>n+e.getBoundingClientRect().height,0);
    head.classList.toggle('scrolled',scrollY>bars);
    const buy=page.querySelector('.client-cart-button').getBoundingClientRect();
    page.querySelector('.good-page__header').classList.toggle('scrolled',buy.bottom<head.getBoundingClientRect().bottom);
  }
  window.addEventListener('scroll',()=>{if(!tick)tick=requestAnimationFrame(scroll);},{passive:true});
  window.addEventListener('resize',scroll);scroll();
  // Videos load only when their slide is near the viewport, including after opening Description.
  const videos=new IntersectionObserver(entries=>{for(const {target,isIntersecting}of entries){if(isIntersecting){if(target.dataset.videoSrc){target.src=target.dataset.videoSrc;delete target.dataset.videoSrc;target.preload='metadata';target.load();}target.play().catch(()=>{});}else target.pause();}},{rootMargin:'150px'});
  document.querySelectorAll('video[data-video-src]').forEach(video=>videos.observe(video));
  document.querySelectorAll('.sc-11').forEach(slider=>{
    let start;
    slider.addEventListener('touchstart',e=>{start=e.changedTouches[0].clientX;},{passive:true});
    slider.addEventListener('touchend',e=>{if(start===undefined)return;const diff=start-e.changedTouches[0].clientX;if(Math.abs(diff)>40){const choices=[...slider.querySelectorAll('input[name^="slider-nav-"]')];if(choices.length){const index=choices.findIndex(e=>e.checked);choices[(index+(diff>0?1:-1)+choices.length)%choices.length].checked=true;}}start=undefined;},{passive:true});
  });
  document.addEventListener('DOMContentLoaded',()=>{const map=document.querySelector('.offline-map-wrap');if(map)map.style.display='none';});
  // All layout scripts have run before showing the product, so a slow download cannot expose old structure.
  document.fonts.ready.then(()=>requestAnimationFrame(()=>document.documentElement.removeAttribute('data-initializing')));
})();
