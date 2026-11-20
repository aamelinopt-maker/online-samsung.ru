/* Header, menus and footer behavior shared with the current local homepage.
 * Product state and fulfillment remain owned by offline.js / product-fulfillment.js.
 */
(() => {
  'use strict';
  const $=(s,root=document)=>root.querySelector(s),$$=(s,root=document)=>[...root.querySelectorAll(s)];
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const products=Object.values(window.samsungChromeContent.products);
  const items=[...new Map(products.map(p=>[p.id,p])).values()];
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ui=()=>window.samsungOffline;
  const panelTriggers=$$('[data-home-chrome] :is(#search-toggle,[data-favorites-open],[data-compare-open]),[data-mobile-bottom-nav] [data-favorites-open]');
  let modal;
  function show(title,body){
    if(!modal){
      modal=document.createElement('dialog');modal.id='client-dialog';modal.className='client-dialog';
      modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
      modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();modal.close();}});
      modal.addEventListener('close',()=>{if(modal.open)return;modal.replaceChildren();modal.removeAttribute('aria-labelledby');panelTriggers.forEach(el=>el.setAttribute('aria-expanded','false'));});
      $('[data-home-overlays]').append(modal);
      panelTriggers.forEach(el=>el.setAttribute('aria-controls','client-dialog'));
    }
    modal.innerHTML='<div class="client-dialog-header"><h2 id="client-dialog-title"></h2><button type="button" class="client-close" aria-label="Закрыть">×</button></div><div class="client-dialog-content"></div>';
    modal.setAttribute('aria-labelledby','client-dialog-title');$('h2',modal).textContent=title;$('.client-dialog-content',modal).innerHTML=body;
    $('.client-close',modal).onclick=()=>modal.close();
    if(!modal.open){modal.showModal();if(!reduce.matches)modal.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out'});}
    return modal;
  }
  function productImage(p,alt=p.title){return '<img src="'+escape(p.thumbnail||p.image)+'" width="105" height="120" loading="lazy" decoding="async" alt="'+escape(alt)+'">';}
  function sync(){
    const state=ui().getState();
    $$(':is([data-home-chrome],[data-mobile-bottom-nav]) [data-count]').forEach(el=>{const key=el.dataset.count;const count=key==='cart'?state.cart.reduce((n,p)=>n+(p.quantity||1),0):state[key].length;el.textContent=count;el.hidden=!count;});
  }
  function resolve(item){return items.find(p=>p.id===String(item?.id??item)) || items.find(p=>p.title===item?.title) || (item?.title?{...window.samsungChromeContent.products.current,title:item.title}:window.samsungChromeContent.products.current);}
  function listView(key){
    const rows=ui().getState()[key].map(item=>({...resolve(item),listId:String(item)}));
    show({favorites:'Избранное',compare:'Сравнение'}[key],(rows.length?rows.map(p=>'<article class="client-list-row"><a href="'+escape(p.url)+'">'+productImage(p)+'</a><div><h3><a href="'+escape(p.url)+'">'+escape(p.title)+'</a></h3><p class="client-list-price">'+escape(p.price)+'</p><div class="client-list-actions"><button data-remove="'+escape(p.listId)+'">Удалить</button></div></div></article>').join(''):'<p>Здесь пока нет товаров.</p>')+'<a class="button button-dark" href="https://online-samsung.ru/" target="_blank" rel="noopener">Открыть магазин <span aria-hidden="true">↗</span></a>');
    $$('[data-remove]',modal).forEach(el=>el.onclick=()=>{ui().changeList(key,el.dataset.remove);sync();listView(key);});
  }
  function search(query=''){
    show('Поиск товаров','<label for="client-search">Товары магазина</label><input type="search" id="client-search" autocomplete="off" autofocus placeholder="Например, Galaxy"><div class="client-search-results" aria-live="polite"></div>');
    const input=$('input',modal),result=$('.client-search-results',modal);
    input.oninput=()=>{const q=input.value.trim().toLocaleLowerCase('ru'),found=q?items.filter(p=>p.title.toLocaleLowerCase('ru').includes(q)):[];result.innerHTML=q?(found.length?found.slice(0,20).map(p=>'<article class="client-list-row">'+productImage(p,'')+'<div><h3><a href="'+escape(p.url)+'">'+escape(p.title)+'</a></h3><p class="client-list-price">'+escape(p.price)+'</p></div></article>').join(''):'<p>Товары не найдены.</p>'):'';};
    input.value=query;input.oninput();if(document.activeElement!==input)input.focus({preventScroll:true});
  }
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a');if(!el||!el.closest('.home-chrome')||el.closest('.client-dialog'))return;
    let handled=true;
    if(el.hasAttribute('data-favorites-open'))listView('favorites');
    else if(el.hasAttribute('data-compare-open'))listView('compare');
    else if(el.id==='search-toggle')search();
    else if(el.hasAttribute('data-city-open'))window.samsungFulfillment.chooseCity();
    else if(el.hasAttribute('data-login'))show('Личный кабинет','<p>Войдите в аккаунт на online-samsung.ru.</p><a class="button button-dark" href="https://online-samsung.ru/user/login" target="_blank" rel="noopener">Войти <span aria-hidden="true">↗</span></a>');
    else handled=false;
    if(handled){e.preventDefault();if(el.matches('#search-toggle,[data-favorites-open],[data-compare-open]'))el.setAttribute('aria-expanded','true');}
  });
  document.addEventListener('submit',e=>{if(e.target.matches('[data-home-footer] .footer__search')){e.preventDefault();search($('input',e.target).value);}});
  const menuButton=$('#menu-toggle'),menu=$('#mobile-nav');
  const menuToggles=[menuButton,$('[data-mobile-catalog]')];
  const mobileBackdrop=$('[data-mobile-menu-backdrop]'),mobileClose=$('[data-mobile-menu-close]');
  let mobileAnimation,mobileBackdropAnimation,mobileClosing=false,mobileScrollY=0,mobileInert=[],mobileTrigger=menuButton;
  function openMobileMenu(trigger){
    if(!menu.hidden)return;
    mobileTrigger=trigger;
    closeMega();mobileScrollY=scrollY;menu.hidden=false;mobileBackdrop.hidden=false;
    document.documentElement.classList.add('client-menu-open');
    mobileInert=$$('.site-header,.p-topbar,#main-content,.site-footer,.client-cookies,.skip-link,.client-mobile-dock,#block-cookie-form').map(el=>[el,el.inert]);
    mobileInert.forEach(([el])=>el.inert=true);
    menuToggles.forEach(el=>el.setAttribute('aria-expanded','true'));
    menuButton.setAttribute('aria-label','Закрыть меню');
    if(!reduce.matches){
      mobileAnimation=menu.animate([{transform:'translateX(-100%)'},{transform:'translateX(0)'}],{duration:280,easing:'cubic-bezier(.22,1,.36,1)'});
      mobileBackdropAnimation=mobileBackdrop.animate([{opacity:0},{opacity:1}],{duration:220,easing:'ease-out'});
    }
    mobileClose.focus({preventScroll:true});
  }
  function closeMobileMenu(restoreFocus=true,immediate=false){
    if(menu.hidden||(mobileClosing&&!immediate))return;
    const start=getComputedStyle(menu).transform;
    mobileAnimation?.cancel();mobileBackdropAnimation?.cancel();
    const finish=()=>{
      menu.hidden=true;mobileBackdrop.hidden=true;mobileClosing=false;
      document.documentElement.classList.remove('client-menu-open');
      mobileInert.forEach(([el,wasInert])=>el.inert=wasInert);mobileInert=[];
      menuToggles.forEach(el=>el.setAttribute('aria-expanded','false'));
      menuButton.setAttribute('aria-label','Открыть меню');
      window.scrollTo({top:mobileScrollY,behavior:'instant'});
      if(restoreFocus)requestAnimationFrame(()=>{if(menu.hidden)mobileTrigger.focus({preventScroll:true});});
    };
    if(immediate||reduce.matches){finish();return;}
    mobileClosing=true;
    mobileAnimation=menu.animate([{transform:start},{transform:'translateX(-100%)'}],{duration:200,easing:'cubic-bezier(.22,1,.36,1)'});
    mobileBackdropAnimation=mobileBackdrop.animate([{opacity:1},{opacity:0}],{duration:200,easing:'ease-out'});
    mobileAnimation.onfinish=finish;
  }
  mobileClose.onclick=()=>closeMobileMenu();mobileBackdrop.onclick=()=>closeMobileMenu();
  menu.addEventListener('click',event=>{if(event.target.closest('a[href]'))closeMobileMenu(false,true);});
  document.addEventListener('keydown',event=>{
    if(menu.hidden)return;
    if(event.key==='Escape'){event.preventDefault();closeMobileMenu();return;}
    if(event.key==='Tab'){
      const focusables=$$('a[href],button,summary',menu).filter(el=>!el.disabled&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  reduce.addEventListener('change',event=>{if(event.matches){if(mobileAnimation?.playState==='running')mobileAnimation.finish();if(mobileBackdropAnimation?.playState==='running')mobileBackdropAnimation.finish();}});
  const siteHeader=$('.site-header'),desktopNav=$('.desktop-nav'),megaTriggers=$$('[data-mega-trigger]'),megaPanels=$$('[data-mega-panel]'),megaBackdrop=$('[data-mega-backdrop]');
  let activeMega=null,megaCloseTimer,megaOpenTimer,suppressMegaFocus=false;
  function closeMega(restoreFocus=false){
    clearTimeout(megaCloseTimer);clearTimeout(megaOpenTimer);
    const previous=activeMega;
    activeMega=null;megaPanels.forEach(panel=>panel.hidden=true);megaTriggers.forEach(a=>a.setAttribute('aria-expanded','false'));megaBackdrop.hidden=true;
    if(restoreFocus&&previous){suppressMegaFocus=true;previous.focus({preventScroll:true});suppressMegaFocus=false;}
  }
  function openMega(trigger){
    clearTimeout(megaCloseTimer);clearTimeout(megaOpenTimer);
    if(getComputedStyle(desktopNav).display==='none')return;
    closeMobileMenu(false,true);
    activeMega=trigger;
    megaPanels.forEach(panel=>panel.hidden=panel.id!==trigger.dataset.megaTrigger);
    megaTriggers.forEach(a=>a.setAttribute('aria-expanded',String(a===trigger)));
    const top=Math.max(0,siteHeader.getBoundingClientRect().bottom);
    siteHeader.style.setProperty('--mega-top',top+'px');megaBackdrop.style.top=top+'px';megaBackdrop.hidden=false;
  }
  const deferMegaClose=()=>{clearTimeout(megaCloseTimer);clearTimeout(megaOpenTimer);megaCloseTimer=setTimeout(()=>closeMega(),180);};
  megaTriggers.forEach(trigger=>{
    trigger.addEventListener('mouseenter',()=>{clearTimeout(megaCloseTimer);clearTimeout(megaOpenTimer);megaOpenTimer=setTimeout(()=>openMega(trigger),70);});
    trigger.addEventListener('focus',()=>{if(!suppressMegaFocus)openMega(trigger);});
    trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();openMega(trigger);$('a[href]',document.getElementById(trigger.dataset.megaTrigger))?.focus();}});
    trigger.addEventListener('click',e=>{if(matchMedia('(hover:none)').matches&&activeMega!==trigger){e.preventDefault();openMega(trigger);}});
  });
  $$('.desktop-nav > a:not([data-mega-trigger]),.nav-bar > .brand,.nav-actions,.client-utility').forEach(el=>{el.addEventListener('mouseenter',()=>closeMega());el.addEventListener('focusin',()=>closeMega());});
  [siteHeader,...megaPanels].forEach(el=>{el.addEventListener('mouseleave',deferMegaClose);el.addEventListener('mouseenter',()=>clearTimeout(megaCloseTimer));});
  siteHeader.addEventListener('focusout',()=>setTimeout(()=>{if(activeMega&&!document.activeElement.closest('.desktop-nav,[data-mega-panel]'))closeMega();},0));
  megaBackdrop.addEventListener('pointerenter',deferMegaClose);megaBackdrop.addEventListener('click',()=>closeMega());
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeMega){e.preventDefault();closeMega(true);}});
  document.addEventListener('click',e=>{if(activeMega&&!siteHeader.contains(e.target))closeMega();});
  document.addEventListener('scroll',e=>{if(e.target===document&&activeMega)closeMega();},true);
  window.addEventListener('resize',()=>{const desktop=getComputedStyle(desktopNav).display!=='none';if(desktop&&!menu.hidden)closeMobileMenu(false,true);if(activeMega){if(!desktop)closeMega();else openMega(activeMega);}});
  menuToggles.forEach(trigger=>trigger.addEventListener('click',()=>{
    if(menu.hidden)openMobileMenu(trigger);else closeMobileMenu();
  }));


  window.addEventListener('samsung-offline-change',sync);
  window.addEventListener('storage',sync);
  sync();
})();
