/* Local product actions, dialogs and store availability. */
(() => {
  'use strict';
  const storage = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem('samsung-offline:'+key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem('samsung-offline:'+key, JSON.stringify(value)); } catch {} window.dispatchEvent(new CustomEvent('samsung-offline-change')); }
  };
  const favorites = new Set(storage.get('favorites', []));
  const compare = new Set(storage.get('compare', []));
  let dialog;
  function show(title, content, className = '') {
    if (!dialog) {
      dialog = document.createElement('dialog');dialog.className='offline-dialog';
      document.body.append(dialog);
      dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    }
    dialog.className = 'offline-dialog' + (className ? ' ' + className : '');
    dialog.innerHTML='<button type="button" class="offline-close" aria-label="Закрыть">×</button><h2></h2><div class="offline-dialog-content"></div>';
    dialog.querySelector('h2').textContent=title;
    dialog.querySelector('h2').id='offline-dialog-title';
    dialog.setAttribute('aria-labelledby','offline-dialog-title');
    dialog.querySelector('.offline-dialog-content').innerHTML=content;
    dialog.querySelector('.offline-close').onclick=()=>dialog.close();
    if(!dialog.open)dialog.showModal();
    return dialog;
  }
  const escape = value => String(value).replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  function selectTab(name) {
    document.querySelectorAll('.bookmark__content-tab').forEach(e=>{e.classList.toggle('active',e.id===name);e.style.display=e.id===name?'block':'none';});
    document.querySelectorAll('.bookmark__tabs-item').forEach(e=>{
      const active=e.dataset.tab===name;
      e.querySelector('.bookmark__tabs-link')?.classList.toggle('bookmark__tabs-link_active',active);
      e.setAttribute('aria-selected',String(active));
    });
  }
  window.samsungOffline = {
    show, selectTab,
    getState: () => ({cart:window.samsungCart.getItems(), favorites:[...favorites], compare:[...compare]}),
    changeList(key,id) {
      const list=key==='favorites'?favorites:compare;list.delete(String(id));storage.set(key,[...list]);
      document.querySelectorAll(key==='favorites'?'.favorite':'.commerce_compare-link').forEach(link=>{
        const itemId=(link.dataset.offlineAction||link.getAttribute('href')||'').match(/\/(\d+)/)?.[1];
        if(itemId===String(id)){link.classList.remove('active');link.setAttribute('aria-pressed','false');}
      });
    }
  };
  function localForm(title, review=false) {
    show(title,'<form><label>Ваше имя<input name="name" autocomplete="off" required></label>'+(review?'<label>Ваш отзыв<textarea required minlength="5"></textarea></label>':'<label>Телефон<input name="phone" type="tel" autocomplete="off" pattern="[+0-9() \\-]{10,20}" required placeholder="+7 (999) 123-45-67"></label>')+'<button class="btn btn--dark" type="submit">Проверить заполнение</button><p role="status"></p></form>');
    dialog.querySelector('form').onsubmit=e=>{e.preventDefault();e.currentTarget.querySelector('[role=status]').textContent='Поля заполнены.';};
  }
  function oneClickForm(control) {
    const product = document.querySelector('.good-page--client-layout');
    const image = product.querySelector('.product-gallery__image-product');
    const title = product.querySelector('h1').textContent.trim().replace('Ultra Гб', 'Ultra 256 Гб');
    const sku = control.dataset.sku || 'SM-F976BZKBCAU';
    const modal = show('Купить в один клик', `
      <div class="client-one-click-product">
        <img src="${escape(image.src)}" alt="${escape(title)}">
        <div><h3>${escape(title)}</h3><p>Артикул: ${escape(sku)}</p></div>
      </div>
      <form class="client-one-click-form">
        <label for="client-order-phone">Номер телефона <span>*</span></label>
        <input id="client-order-phone" name="phone_number" type="tel" autocomplete="tel" placeholder="Номер телефона" required aria-describedby="client-order-phone-format" minlength="10" maxlength="20">
        <p id="client-order-phone-format" class="client-order-format">Формат: +7 (999) 999-99-99</p>
        <label for="client-order-name">Имя <span>*</span></label>
        <input id="client-order-name" name="name" autocomplete="name" placeholder="Имя" maxlength="128" required>
        <label for="client-order-email">Email</label>
        <input id="client-order-email" name="email" type="email" autocomplete="email" placeholder="Email" maxlength="254">
        <label class="client-order-agreement"><input name="agreement" type="checkbox" required checked><span>Согласен на обработку <a href="https://online-samsung.ru/privacy" target="_blank" rel="noopener">персональных данных</a> <em>*</em></span></label>
        <button class="btn btn--dark" type="submit">Создать заказ</button>
        <div role="status"></div>
      </form>`, 'client-one-click-dialog');
    modal.querySelector('form').onsubmit = event => {
      event.preventDefault();
      modal.querySelector('[role="status"]').innerHTML = '<p>Для завершения заказа <a href="https://online-samsung.ru/product/sm-f976bzkbcau" target="_blank" rel="noopener">перейдите на сайт магазина</a>.</p>';
    };
  }
  document.addEventListener('submit',e=>{
    if(e.target.closest('.offline-dialog,.home-chrome'))return;
    e.preventDefault();e.stopImmediatePropagation();
    show('Продолжить на сайте магазина','<a class="btn btn--dark" href="https://online-samsung.ru" target="_blank" rel="noopener">Перейти на сайт</a>');
  },true);
  document.addEventListener('click',e=>{
    const el=e.target.closest('a,button,input[type=submit],.bookmark__tabs-item');
    if(!el || el.closest('.offline-dialog,.home-chrome'))return;
    if(el.closest('[data-client-action],[data-client-tab]'))return;
    const href=el.dataset.offlineAction || el.getAttribute('href') || '';
    function stop(){e.preventDefault();e.stopImmediatePropagation();}
    if(el.closest('.bookmark__tabs-item')) {
      stop();selectTab(el.closest('.bookmark__tabs-item').dataset.tab);return;
    }
    if(el.matches('[is="add-to-cart"],.product-buy__submit-btn,.clone-product-buy__submit-btn,.client-mobile-purchase-buy')){
      if(el.matches('a[data-in-cart]'))return;
      stop();window.samsungCart.purchase(el);return;
    }
    if(el.matches('.favorite,.commerce_compare-link')){
      stop();const favorite=el.matches('.favorite'), state=favorite?favorites:compare;
      const id=href.match(/\/(\d+)/)?.[1] || '50169';
      if(state.has(id))state.delete(id);else state.add(id);
      el.classList.toggle('active',state.has(id));el.setAttribute('aria-pressed',String(state.has(id)));
      el.closest('.favorite-link')?.classList.toggle('action-remove',state.has(id));
      storage.set(favorite?'favorites':'compare',[...state]);
      show(favorite?'Избранное':'Сравнение','<p>'+(state.has(id)?'Товар добавлен.':'Товар удалён.')+'</p>');return;
    }
    if(/availability_stores/.test(href)){stop();selectTab('availability_stores');document.querySelector('.bookmark__tabs-list')?.scrollIntoView({behavior:'smooth'});return;}
    if(/get-confirm-order/.test(href)){stop();oneClickForm(el);return;}
    if(/review\/add/.test(href)){stop();localForm('Оставить отзыв',true);return;}
    if(/get-reviews-ajax/.test(href)){stop();selectTab('reviews_ratings');return;}
    if(el.closest('.pager') || /inform|payment|user\/login|your-price/.test(href)){
      stop();show('Продолжить на сайте магазина','<a class="btn btn--dark" href="https://online-samsung.ru" target="_blank" rel="noopener">Перейти на сайт</a>');
    }
  },true);
  document.addEventListener('change',e=>{
    if(!e.target.matches('.product--rendered-attribute input[type=radio]'))return;
    e.stopImmediatePropagation();
    const group=e.target.closest('.product--rendered-attribute');
    group.querySelectorAll('input').forEach(x=>x.classList.toggle('product--rendered-attribute__selected',x.checked));
    document.dispatchEvent(new CustomEvent('samsung:variant-change'));

  },true);
  document.addEventListener('DOMContentLoaded',()=>{
    const cookieNotice = document.getElementById('block-cookie-form');
    let accepted = storage.get('cookies', false);
    try {
      accepted ||= document.cookie.split(';').some(cookie => cookie.trim().startsWith('Drupal.visitor.cookiepolitic='));
    } catch {}
    cookieNotice.classList.toggle('active', !accepted);
    cookieNotice.querySelector('button').addEventListener('click', () => {
      storage.set('cookies', true);
      cookieNotice.classList.remove('active');
    });
    selectTab(document.querySelector('.bookmark__content-tab.active').id);
    document.querySelectorAll('.scroll-top').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      window.scrollTo({top:0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    }));
    document.querySelectorAll('.bookmark__tabs-item').forEach((e,i)=>{
      e.tabIndex=0;e.setAttribute('role','tab');
      e.addEventListener('keydown',event=>{
        const tabs=[...document.querySelectorAll('.bookmark__tabs-item')];let target;
        if(event.key==='Enter'||event.key===' '){event.preventDefault();selectTab(e.dataset.tab);}
        if(event.key==='ArrowRight')target=tabs[(i+1)%tabs.length];
        if(event.key==='ArrowLeft')target=tabs[(i+tabs.length-1)%tabs.length];
        if(target){event.preventDefault();target.focus();selectTab(target.dataset.tab);}
      });
    });
    prepareStores();
  });

  function prepareStores() {
    const stores = document.querySelector('.shop-list');
    if (!stores) return;
    const host = stores.querySelector('#map-shops');
    const views = stores.querySelector('.shop-list__container');
    const table = stores.querySelector('.shop-list__table');
    const empty = stores.querySelector('.shop-list__empty');
    const search = stores.querySelector('.shop-list__search-form input');
    const listButton = stores.querySelector('.shop-list__switch-button--list');
    const mapButton = stores.querySelector('.shop-list__switch-button--map');
    const rows = [...table.querySelectorAll('.shop-item')];
    const wrap = document.createElement('div');
    wrap.className = 'offline-map-wrap';
    host.before(wrap);
    const fallback = document.createElement('div');
    fallback.className = 'offline-map-fallback';
    fallback.innerHTML = '<strong>Карта магазинов</strong><span>Адреса магазинов доступны в списке и на Яндекс Картах.</span><a href="https://yandex.ru/maps/?text=Samsung%20Москва" target="_blank" rel="noopener">Открыть Яндекс Карты</a><button type="button" class="btn">Повторить загрузку</button>';
    wrap.append(host, fallback);

    let map, loading = false, mapMode = false;
    function refreshMarkers() {
      if (!map) return;
      const coordinates = [];
      map.geoObjects.removeAll();
      for (const row of rows) {
        if (row.classList.contains('hide') || !row.dataset.geolat || !row.dataset.geolong) continue;
        const point = [Number(row.dataset.geolat), Number(row.dataset.geolong)];
        coordinates.push(point);
        map.geoObjects.add(new ymaps.Placemark(point, {
          balloonContentHeader: escape(row.dataset.title),
          balloonContentBody: escape(row.querySelector('.shop-address').textContent.trim())
        }));
      }
      map.container.fitToViewport();
      if (coordinates.length > 1) map.setBounds(map.geoObjects.getBounds(), {checkZoomRange:true, zoomMargin:24});
      else if (coordinates.length) map.setCenter(coordinates[0], 14);
    }
    function filter() {
      const term = search.value.trim().toLocaleLowerCase('ru');
      for (const row of rows) row.classList.toggle('hide', !row.textContent.toLocaleLowerCase('ru').includes(term));
      const noResults = rows.every(row => row.classList.contains('hide'));
      table.style.display = !mapMode && noResults ? 'none' : '';
      empty.style.display = !mapMode && noResults ? 'block' : 'none';
      if (mapMode) refreshMarkers();
    }

    function loadMap() {
      if (map || loading) return;
      loading = true;
      const script = document.createElement('script');
      script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=97f4b2fd-59ae-49f8-b3be-87f71ef5e82d';
      const timeout = setTimeout(fail, 12000);
      function fail() {
        clearTimeout(timeout);
        script.remove();
        loading = false;
      }
      script.onerror = fail;
      script.onload = () => {
        if (!window.ymaps) { fail(); return; }
        window.ymaps.ready(() => {
          if (!loading || !script.isConnected) return;
          try {
            map = new ymaps.Map(host, {center:[55.75,37.62],zoom:10,controls:['zoomControl']});
            refreshMarkers();
            fallback.hidden = true;
            clearTimeout(timeout);
            loading = false;
          } catch {
            map?.destroy();
            map = undefined;
            fail();
          }
        }, fail);
      };
      document.head.append(script);
    }
    function selectMap(showMap) {
      mapMode = showMap;
      views.classList.toggle('shop-list__container--map-view', showMap);
      mapButton.classList.toggle('is-active', showMap);
      listButton.classList.toggle('is-active', !showMap);
      mapButton.setAttribute('aria-pressed', String(showMap));
      listButton.setAttribute('aria-pressed', String(!showMap));
      filter();
      if (showMap) loadMap();
    }
    search.addEventListener('input', filter);
    mapButton.addEventListener('click', () => selectMap(true));
    listButton.addEventListener('click', () => selectMap(false));
    fallback.querySelector('button').addEventListener('click', loadMap);
    selectMap(false);
  }
})();
