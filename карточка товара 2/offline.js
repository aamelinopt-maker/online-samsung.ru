/* Small compatibility layer; original scripts retain ownership of visual UI. */
(() => {
  'use strict';
  const disabled = ['richContentInit','richContentSubscriber','huaAddToCart','commerceCartBlock','commerceCompare','autocompleteCity','ymapShops'];
  if (window.Drupal) disabled.forEach(name => { Drupal.behaviors[name] = { attach() {} }; });
  const storage = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem('samsung-offline:'+key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem('samsung-offline:'+key, JSON.stringify(value)); } catch {} }
  };
  let cart = storage.get('cart', []);
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
  function cartView() {
    show('Корзина',cart.length ? cart.map(x=>'<p>'+escape(x.title)+'</p>').join('')+'<a class="btn btn--dark" href="https://online-samsung.ru/product/sm-f976bzkbcau" target="_blank" rel="noopener">Перейти на сайт</a><button class="btn" id="offline-clear-cart">Очистить</button>' : '<p>Корзина пока пуста. Добавьте товар кнопкой «Купить».</p>');
    dialog.querySelector('#offline-clear-cart')?.addEventListener('click',()=>{cart=[];storage.set('cart',cart);cartView();});
  }
  function selectTab(name) {
    document.querySelectorAll('.bookmark__content-tab').forEach(e=>{e.classList.toggle('active',e.id===name);e.style.display=e.id===name?'block':'none';});
    document.querySelectorAll('.bookmark__tabs-item').forEach(e=>{
      const active=e.dataset.tab===name;
      e.querySelector('.bookmark__tabs-link')?.classList.toggle('bookmark__tabs-link_active',active);
      e.setAttribute('aria-selected',String(active));
    });
  }
  window.samsungOffline = {show, selectTab};
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
    if(e.target.closest('.offline-dialog'))return;
    e.preventDefault();e.stopImmediatePropagation();
    show('Продолжить на сайте магазина','<a class="btn btn--dark" href="https://online-samsung.ru" target="_blank" rel="noopener">Перейти на сайт</a>');
  },true);
  document.addEventListener('click',e=>{
    const el=e.target.closest('a,button,input[type=submit],.bookmark__tabs-item,.region-switcher__change');
    if(!el || el.closest('.offline-dialog'))return;
    if(el.closest('[data-client-action],[data-client-tab]'))return;
    const href=el.dataset.offlineAction || el.getAttribute('href') || '';
    function stop(){e.preventDefault();e.stopImmediatePropagation();}
    if(el.closest('.bookmark__tabs-item')) {
      stop();selectTab(el.closest('.bookmark__tabs-item').dataset.tab);return;
    }
    if(el.matches('[is="add-to-cart"],.product-buy__submit-btn')){
      stop();const card=el.closest('.product-teaser');
      const title=(card?.querySelector('.product-teaser__title') || document.querySelector('h1'))?.textContent.trim() || 'Товар';
      cart.push({title});storage.set('cart',cart);cartView();return;
    }
    if(el.matches('.header__cart') || /\/cart\/?$/.test(href)){stop();cartView();return;}
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
    if(/change\/location/.test(href) || el.matches('.region-switcher__change')){
      stop();
      if (window.samsungFulfillment) window.samsungFulfillment.chooseCity();
      else show('Ваш город','<p>Москва</p>');
      return;
    }
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
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape')document.querySelector('.product-images__mobile.active .product-images__close')?.click();
    });
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
    document.querySelectorAll('.shop-list__search-form input').forEach(input=>input.addEventListener('input',()=>{
      const term=input.value.toLocaleLowerCase('ru');
      document.querySelectorAll('.shop-item').forEach(e=>e.classList.toggle('hide',!e.textContent.toLocaleLowerCase('ru').includes(term)));
    }));
    prepareMap();
  });
  function prepareMap() {
    const host=document.querySelector('#map-shops');if(!host)return;
    const wrap=document.createElement('div');wrap.className='offline-map-wrap';host.parentNode.insertBefore(wrap,host);wrap.append(host);
    const fallback=document.createElement('div');fallback.className='offline-map-fallback';
    fallback.innerHTML='<strong>Карта магазинов</strong><span>Адреса магазинов доступны в списке и на Яндекс Картах.</span><a href="https://yandex.ru/maps/?text=Samsung%20Москва" target="_blank" rel="noopener">Открыть Яндекс Карты</a><button type="button" class="btn">Повторить загрузку</button>';
    wrap.append(fallback);
    let loading=false,ready=false;
    function init(){
      if(ready || loading)return;loading=true;
      const script=document.createElement('script');script.src='https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=97f4b2fd-59ae-49f8-b3be-87f71ef5e82d';
      script.onerror=()=>{loading=false;};
      script.onload=()=>{window.ymaps?.ready(()=>{
        try {
          if(!window.myMap)window.initMapStores();
          const check=setInterval(()=>{
            const map=window.myMap;
            if(map && host.querySelector('canvas,ymaps[class*="ground-pane"]')){ready=true;loading=false;fallback.hidden=true;clearInterval(check);map.container.fitToViewport();}
          },250);
          setTimeout(()=>{clearInterval(check);loading=false;},18000);
        }catch{loading=false;}
      });};
      document.head.append(script);
    }
    fallback.querySelector('button').onclick=()=>{if(window.myMap){window.myMap.container.fitToViewport();fallback.hidden=!!host.querySelector('canvas');}else init();};
    document.querySelector('.shop-list__switch-button--map')?.addEventListener('click',()=>{init();setTimeout(()=>window.myMap?.container.fitToViewport(),100);});
    window.addEventListener('online',init);
  }
})();
