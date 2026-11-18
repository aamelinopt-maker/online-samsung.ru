/* Browser-only behavior for the source content in the supplied client design. */
(() => {
  'use strict';
  const products=window.samsungHomeContent.products;
  const $=(s,root=document)=>root.querySelector(s), $$=(s,root=document)=>[...root.querySelectorAll(s)];
  const safe={get(k,f){try{return JSON.parse(localStorage.getItem('samsung-home-offline:'+k))??f;}catch{return f;}},set(k,v){try{localStorage.setItem('samsung-home-offline:'+k,JSON.stringify(v));}catch{}}};
  const state={cart:safe.get('cart',[]),favorites:safe.get('favorites',[]),compare:safe.get('compare',[])};
  Object.keys(state).forEach(k=>{if(!Array.isArray(state[k]))state[k]=[];});
  const currentProducts=new Map(Object.values(products).map(product=>[product.id,product]));
  Object.keys(state).forEach(key=>{state[key]=state[key].filter(product=>product&&currentProducts.has(product.id)).map(product=>({...currentProducts.get(product.id),...(key==='cart'?{quantity:Math.max(1,Math.trunc(Number(product.quantity)||1))}:{})}));});
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const items=Object.values(products);
  const uniqueItems=[...new Map(items.map(p=>[p.url,p])).values()];
  let modal,city='Москва';
  function sync(){
    $$('[data-favorite],[data-compare]').forEach(button=>{
      const key=button.hasAttribute('data-favorite')?'favorites':'compare';
      const p=products[button.dataset.favorite||button.dataset.compare];
      const selected=state[key].some(x=>x.id===p.id);
      button.setAttribute('aria-pressed',String(selected));
    });
    $$('[data-count]').forEach(el=>{
      const count=el.dataset.count==='cart'?state.cart.reduce((n,p)=>n+(p.quantity||1),0):state[el.dataset.count].length;
      el.textContent=count;el.hidden=!count;
    });
  }
  function save(){Object.entries(state).forEach(([k,v])=>safe.set(k,v));sync();}
  function show(title,body){
    if(!modal){
      modal=document.createElement('dialog');modal.id='client-dialog';modal.className='client-dialog';modal.setAttribute('aria-labelledby','client-dialog-title');
      modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
      modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();modal.close();}});
      modal.addEventListener('close',()=>{$$('#search-toggle,[data-cart-open],[data-favorites-open],[data-compare-open]').forEach(el=>el.setAttribute('aria-expanded','false'));});
      document.body.append(modal);
    }
    modal.innerHTML='<div class="client-dialog-header"><h2 id="client-dialog-title"></h2><button type="button" class="client-close" aria-label="Закрыть">×</button></div><div class="client-dialog-content"></div>';
    $('h2',modal).textContent=title;$('.client-dialog-content',modal).innerHTML=body;
    $('.client-close',modal).onclick=()=>modal.close();
    if(!modal.open){
      modal.showModal();
      if(!reduce.matches)modal.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:250,easing:'cubic-bezier(.22,1,.36,1)'});
    }
    return modal;
  }
  const demo='<p class="client-demo-note">Демонстрация офлайн. Заказ и оплата доступны на сайте магазина.</p>';
  function listView(key){
    const titles={cart:'Корзина',favorites:'Избранное',compare:'Сравнение'};
    show(titles[key],demo+(state[key].length?state[key].map(p=>'<article class="client-list-row"><a href="'+escape(p.url)+'"><img src="'+escape(p.image)+'" alt="'+escape(p.title)+'"></a><div><h3><a href="'+escape(p.url)+'">'+escape(p.title)+'</a></h3><p class="client-list-price">'+escape(p.price)+'</p><div class="client-list-actions">'+(key==='cart'?'<button data-quantity="-1" data-id="'+escape(p.id)+'" aria-label="Уменьшить количество">−</button><span>'+p.quantity+'</span><button data-quantity="1" data-id="'+escape(p.id)+'" aria-label="Увеличить количество">+</button>':'')+'<button data-remove="'+escape(p.id)+'">Удалить</button></div></div></article>').join(''):'<p>Здесь пока нет товаров.</p>')+'<a class="button button-dark" href="https://online-samsung.ru/" target="_blank" rel="noopener">Открыть магазин <span aria-hidden="true">↗</span></a>');
    $$('[data-remove]',modal).forEach(el=>el.onclick=()=>{state[key]=state[key].filter(p=>p.id!==el.dataset.remove);save();listView(key);});
    $$('[data-quantity]',modal).forEach(el=>el.onclick=()=>{const p=state.cart.find(p=>p.id===el.dataset.id);p.quantity+=+el.dataset.quantity;state.cart=state.cart.filter(p=>p.quantity>0);save();listView('cart');});
  }
  function add(p){const found=state.cart.find(x=>x.id===p.id);if(found)found.quantity=(found.quantity||1)+1;else state.cart.push({...p,quantity:1});save();listView('cart');}
  function toggle(p,key){const found=state[key].some(x=>x.id===p.id);state[key]=found?state[key].filter(x=>x.id!==p.id):[...state[key],p];save();}
  function search(query=''){
    show('Поиск по сохранённым товарам','<label for="client-search">Поиск по сайту</label><input type="search" id="client-search" autocomplete="off" placeholder="Например, Galaxy"><div class="client-search-results" aria-live="polite"></div><p>Поиск работает по товарам, сохранённым с главной страницы.</p>');
    const input=$('input',modal),result=$('.client-search-results',modal);
    input.oninput=()=>{
      const q=input.value.trim().toLocaleLowerCase('ru'),found=q?uniqueItems.filter(p=>p.title.toLocaleLowerCase('ru').includes(q)):[];
      result.innerHTML=q?(found.length?found.slice(0,20).map(p=>'<article class="client-list-row"><img src="'+escape(p.image)+'" alt=""><div><h3><a href="'+escape(p.url)+'">'+escape(p.title)+'</a></h3><p class="client-list-price">'+escape(p.price)+'</p></div></article>').join(''):'<p>Совпадений в сохранённых товарах нет.</p>'):'';
    };
    input.value=query;input.oninput();input.focus();
  }
  function chooseCity(){
    show('Ваш город '+city+'?','<form id="client-city-form"><label>Название города<input name="city" value="'+escape(city)+'" maxlength="80" required></label><button class="button button-dark" type="submit">Да</button><p>Изменить город можно в этой копии. Условия доставки уточняются на сайте магазина.</p></form>');
    $('form',modal).onsubmit=e=>{e.preventDefault();city=new FormData(e.target).get('city').trim()||city;$$('[data-city]').forEach(el=>el.textContent=city);modal.close();};
  }
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a');if(!el||el.closest('.client-dialog'))return;
    let handled=true;
    if(el.hasAttribute('data-add'))add(products[el.dataset.add]);
    else if(el.hasAttribute('data-favorite'))toggle(products[el.dataset.favorite],'favorites');
    else if(el.hasAttribute('data-compare'))toggle(products[el.dataset.compare],'compare');
    else if(el.hasAttribute('data-cart-open'))listView('cart');
    else if(el.hasAttribute('data-favorites-open'))listView('favorites');
    else if(el.hasAttribute('data-compare-open'))listView('compare');
    else if(el.id==='search-toggle')search();
    else if(el.hasAttribute('data-city-open'))chooseCity();
    else if(el.hasAttribute('data-accept-cookies')){safe.set('cookies',true);$('#block-cookie-form').hidden=true;}
    else if(el.hasAttribute('data-notifications'))show('Уведомления','<p>Нет уведомлений</p>');
    else if(el.hasAttribute('data-login')||el.hasAttribute('data-notify'))show('Продолжить на сайте магазина','<p>Вход в аккаунт и отправка заявок требуют подключения к магазину. В офлайн-копии данные не отправляются.</p><a class="button button-dark" href="https://online-samsung.ru/user/login" target="_blank" rel="noopener">Открыть магазин <span aria-hidden="true">↗</span></a>');
    else handled=false;
    if(handled){e.preventDefault();if(el.matches('#search-toggle,[data-cart-open],[data-favorites-open],[data-compare-open]'))el.setAttribute('aria-expanded','true');}
  });
  document.addEventListener('submit',e=>{
    if(e.target.matches('.footer__search')){e.preventDefault();search($('input',e.target).value);}
  });
  const menuButton=$('#menu-toggle'),menu=$('#mobile-nav');
  const mobileBackdrop=$('[data-mobile-menu-backdrop]'),mobileClose=$('[data-mobile-menu-close]');
  let mobileAnimation,mobileBackdropAnimation,mobileClosing=false,mobileScrollY=0,mobileInert=[];
  function openMobileMenu(){
    if(!menu.hidden)return;
    closeMega();mobileScrollY=scrollY;menu.hidden=false;mobileBackdrop.hidden=false;
    document.documentElement.classList.add('client-menu-open');
    mobileInert=$$('.site-header,.p-topbar,#main-content,.site-footer,.client-cookies,.skip-link').map(el=>[el,el.inert]);
    mobileInert.forEach(([el])=>el.inert=true);
    menuButton.setAttribute('aria-expanded','true');menuButton.setAttribute('aria-label','Закрыть меню');
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
      menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Открыть меню');
      window.scrollTo({top:mobileScrollY,behavior:'instant'});
      if(restoreFocus)menuButton.focus({preventScroll:true});
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
  menuButton.onclick=()=>{if(menu.hidden)openMobileMenu();else closeMobileMenu();};

  function fitImage(box){
    const im=$('img',box);if(!im)return;const r=box.getBoundingClientRect();if(!r.width||!r.height)return;
    const b=JSON.parse(box.dataset.bounds),w=+im.getAttribute('width'),h=+im.getAttribute('height');
    const category=box.classList.contains('m-category-media');
    const base=Math.min(r.width/w,r.height/h),scale=Math.min(r.width*(category ? 0.80 : 0.83)/((b[2]-b[0])*base),r.height*(category ? 0.78 : 0.85)/((b[3]-b[1])*base),5,1/base);
    box.style.setProperty('--fit-scale',scale);box.style.setProperty('--fit-x',(w/2-(b[0]+b[2])/2)*base*scale+'px');box.style.setProperty('--fit-y',(h/2-(b[1]+b[3])/2)*base*scale+'px');
    // Account for the optical transform and hover zoom when choosing a raster.
    // The bitmap canvas can be wider than its visible product/card frame.
    if(im.hasAttribute('srcset')){
      const sizes=Math.ceil(r.width*scale*1.04)+'px';
      if(im.sizes!==sizes)im.sizes=sizes;
    }
  }
  const fits=$$('[data-fit-image]');
  const observer=new ResizeObserver(entries=>entries.forEach(e=>fitImage(e.target)));
  fits.forEach(el=>{fitImage(el);observer.observe(el);});

  $$('.m-collection').forEach(section=>{
    const tabs=$$('[role=tab]',section),panels=$$('[role=tabpanel]',section);
    const frame=$('.m-collection-panels',section);
    let frameWidth=0;
    const cardAnimations=new Set();
    function alignTeaserTitles(panel){
      if(!['new','hits'].includes(section.id)||panel.hidden)return;
      const titles=$$('.client-hit-native h3',panel);
      titles.forEach(title=>title.style.minHeight='0');
      const height=Math.ceil(Math.max(0,...titles.map(title=>title.getBoundingClientRect().height)));
      titles.forEach(title=>title.style.minHeight=height+'px');
    }
    // Match the template's largest-panel reservation: changing a category
    // must not pull the next section up or shift the document scroll position.
    function keepHeight(force=false){
      const width=frame.getBoundingClientRect().width;
      if(!width||(!force&&Math.abs(width-frameWidth)<.5))return;
      frameWidth=width;
      let height=0;
      panels.forEach(panel=>{
        const hidden=panel.hidden,style=panel.getAttribute('style');
        panel.style.cssText+=';position:absolute;visibility:hidden;pointer-events:none;width:'+width+'px;';
        panel.hidden=false;alignTeaserTitles(panel);
        height=Math.max(height,panel.getBoundingClientRect().height);
        panel.hidden=hidden;
        if(style===null)panel.removeAttribute('style');else panel.setAttribute('style',style);
      });
      frame.style.minHeight=Math.ceil(height)+'px';
    }
    function select(tab,focus=false){
      cardAnimations.forEach(animation=>animation.cancel());cardAnimations.clear();
      tabs.forEach(t=>{const on=t===tab;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;$('#'+t.getAttribute('aria-controls')).hidden=!on;});
      const panel=$('#'+tab.getAttribute('aria-controls'));
      alignTeaserTitles(panel);
      $$('[data-fit-image]',panel).forEach(fitImage);
      if(!reduce.matches)$$('.m-product-card',panel).forEach((card,i)=>{
        const animation=card.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:480,delay:i*45,easing:'cubic-bezier(.22,1,.36,1)'});
        cardAnimations.add(animation);animation.onfinish=()=>cardAnimations.delete(animation);
      });
      if(focus)tab.focus({preventScroll:true});
      const list=tab.closest('.m-tablist'),r=tab.getBoundingClientRect(),lr=list.getBoundingClientRect();
      const delta=r.left<lr.left?r.left-lr.left:r.right>lr.right?r.right-lr.right:0;
      if(delta)list.scrollBy({left:delta,behavior:reduce.matches?'instant':'smooth'});
      $('[data-collection-status]',section).textContent=tab.textContent+'. Товаров: '+$$('.m-product-card',panel).length;
    }
    tabs.forEach((tab,i)=>{
      const warm=()=>$$('img',$('#'+tab.getAttribute('aria-controls'))).forEach(image=>{image.loading='eager';image.decode?.().catch(()=>{});});
      tab.addEventListener('pointerenter',warm,{passive:true});tab.addEventListener('focus',warm);
      tab.onclick=()=>select(tab);
      tab.onkeydown=e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();select(tabs[next],true);}};
    });
    panels.forEach(panel=>{
      const grid=$('[data-product-grid]',panel);
      new ResizeObserver(()=>{if(!panel.hidden)alignTeaserTitles(panel);}).observe(grid);
      if(!panel.hidden)alignTeaserTitles(panel);
    });
    keepHeight();new ResizeObserver(()=>keepHeight()).observe(frame);
    document.fonts.ready.then(()=>keepHeight(true));
    reduce.addEventListener('change',event=>{if(event.matches){cardAnimations.forEach(animation=>animation.cancel());cardAnimations.clear();}});
  });

  function slider({slides,buttons,prev,next,stage,activeClass='is-active',loop=true,onChange}){
    let index=0,startX=null,startY=null,suppressedClick=null,suppressionTimer;
    function clearSuppressedClick(){
      clearTimeout(suppressionTimer);
      if(suppressedClick){stage.removeEventListener('click',suppressedClick,true);suppressedClick=null;}
    }
    function go(value){
      index=loop?(value+slides.length)%slides.length:Math.max(0,Math.min(slides.length-1,value));
      slides.forEach((s,i)=>{const on=i===index;s.classList.toggle(activeClass,on);s.inert=!on;s.setAttribute('aria-hidden',String(!on));});
      buttons.forEach(b=>{const on=+b.dataset.go===index;b.setAttribute('aria-pressed',String(on));b.classList.toggle(activeClass,on);});
      if(!loop){if(prev)prev.disabled=index===0;if(next)next.disabled=index===slides.length-1;}
      $$('[data-fit-image]',slides[index]).forEach(fitImage);onChange?.(index);
    }
    function manualSelect(event,value){
      // Mouse/touch selection restarts the clock; keyboard focus keeps it
      // paused for reading, exactly as on the template's hero tabs.
      if(stage.matches('.hero-carousel')&&event.detail>0)event.currentTarget.blur();
      go(value);
    }
    buttons.forEach(b=>b.onclick=event=>manualSelect(event,+b.dataset.go));
    prev?.addEventListener('click',event=>manualSelect(event,index-1));next?.addEventListener('click',event=>manualSelect(event,index+1));
    stage.addEventListener('keydown',e=>{clearSuppressedClick();if(e.target.matches('input'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(index+(e.key==='ArrowRight'?1:-1));}});
    stage.addEventListener('pointerdown',e=>{clearSuppressedClick();startX=e.clientX;startY=e.clientY;});
    stage.addEventListener('pointercancel',()=>{startX=null;clearSuppressedClick();});
    stage.addEventListener('pointerup',e=>{
      if(startX===null)return;const dx=e.clientX-startX,dy=e.clientY-startY;startX=null;
      if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){
        go(index+(dx<0?1:-1));
        suppressedClick=event=>{event.preventDefault();event.stopPropagation();clearSuppressedClick();};
        stage.addEventListener('click',suppressedClick,{once:true,capture:true});
        suppressionTimer=setTimeout(clearSuppressedClick,400);
      }
    });
    go(0);return{go,next:()=>go(index+1),get index(){return index;}};
  }
  const heroSlides=$$('[data-hero-slide]'),heroStage=$('.hero-carousel'),heroPause=$('[data-hero-pause]');
  const hoverDevice=matchMedia('(hover:hover)'),heroInterval=5000;
  let resetHeroClock=()=>{};
  const hero=slider({slides:heroSlides,buttons:$$('[data-hero-go]').map(b=>{b.dataset.go=b.dataset.heroGo;return b;}),stage:heroStage,onChange:i=>{heroStage.dataset.theme=heroSlides[i].dataset.theme;$('[data-hero-current]').textContent=String(i+1).padStart(2,'0');for(const index of [i,(i+1)%heroSlides.length]){const image=$('img',heroSlides[index]);image.loading='eager';image.decode?.().catch(()=>{});}resetHeroClock();}});
  let paused=reduce.matches,timer,elapsed=0,startedAt=0,heroInView=true,heroProgress;
  function syncPause(){
    heroPause.setAttribute('aria-pressed',String(paused));
    heroPause.setAttribute('aria-label',paused?'Продолжить слайдер':'Остановить слайдер');
  }
  function autoplay(){
    if(timer!==undefined)elapsed=Math.min(heroInterval,elapsed+performance.now()-startedAt);
    clearTimeout(timer);timer=undefined;
    heroProgress?.pause();
    const blocked=paused||reduce.matches||!heroInView||document.hidden||modal?.open||!menu.hidden||activeMega||heroStage.contains(document.activeElement)||(hoverDevice.matches&&heroStage.querySelector('.client-live-link:hover'));
    heroStage.dataset.playing=String(!blocked);syncPause();
    if(heroProgress)heroProgress.currentTime=reduce.matches?heroInterval:elapsed;
    if(!blocked){startedAt=performance.now();heroProgress?.play();timer=setTimeout(()=>hero.next(),Math.max(0,heroInterval-elapsed));}
  }
  resetHeroClock=()=>{
    clearTimeout(timer);timer=undefined;heroProgress?.cancel();elapsed=0;
    heroProgress=$('[data-hero-go="'+hero.index+'"] .hero-page-fill').animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:heroInterval,fill:'both',easing:'linear'});
    heroProgress.pause();autoplay();
  };
  heroPause.onclick=event=>{paused=!paused;if(event.detail>0)heroPause.blur();autoplay();};
  heroStage.addEventListener('focusin',autoplay);
  heroStage.addEventListener('focusout',()=>setTimeout(autoplay,0));
  $$('.client-live-link',heroStage).forEach(link=>{link.addEventListener('pointerenter',autoplay);link.addEventListener('pointerleave',autoplay);});
  document.addEventListener('visibilitychange',autoplay);
  reduce.addEventListener('change',autoplay);hoverDevice.addEventListener('change',autoplay);
  new MutationObserver(autoplay).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','hidden']});
  if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{heroInView=entry.isIntersecting&&entry.intersectionRatio>=.15;autoplay();},{threshold:.15}).observe(heroStage);
  resetHeroClock();
  function updateCarouselProgress(bar,current,total,label){
    for(const [name,value] of Object.entries({'aria-valuemax':total,'aria-valuenow':current,'aria-valuetext':label})){
      if(bar.getAttribute(name)!==String(value))bar.setAttribute(name,String(value));
    }
    const fill=$('.client-carousel-progress-fill',bar),transform='scaleX('+current/total+')';
    if(fill.style.transform!==transform)fill.style.transform=transform;
    const status=$('[data-carousel-status]',bar.parentElement);
    if(status.textContent!==label)status.textContent=label;
  }
  const dailySlides=$$('[data-daily-slide]'),dailyProgress=$('[data-daily-progress]');
  let warmDaily=()=>{};
  const daily=slider({slides:dailySlides,buttons:[],prev:$('[data-daily-prev]'),next:$('[data-daily-next]'),stage:$('.m-daily-stage'),loop:false,onChange:i=>{updateCarouselProgress(dailyProgress,i+1,dailySlides.length,`Товар ${i+1} из ${dailySlides.length}`);warmDaily(i);}});
  // Reserve each text row across all eight slides. Visibility keeps inactive
  // slides measurable, so prices and actions share one fixed vertical grid.
  const dailyStage=$('.m-daily-stage');
  warmDaily=index=>{
    for(const i of [index,(index+1)%dailySlides.length]){
      const image=$('img',dailySlides[i]);image.hidden=false;
      image.loading='eager';image.decode?.().catch(()=>{});
    }
  };
  if('IntersectionObserver' in window){
    const dailyLoadObserver=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){warmDaily(daily.index);dailyLoadObserver.disconnect();}
    },{rootMargin:'300px'});
    dailyLoadObserver.observe(dailyStage);
  }else warmDaily(daily.index);
  const dailyFields=['.m-daily-category','h3','.m-daily-variant','.m-daily-price','.m-daily-actions'];
  function alignDailyFields(){
    const rows=dailyFields.map(selector=>$$('[data-daily-slide] '+selector,dailyStage));
    rows.flat().forEach(element=>element.style.removeProperty('min-height'));
    const heights=rows.map(elements=>Math.ceil(Math.max(...elements.map(element=>element.getBoundingClientRect().height))));
    rows.forEach((elements,index)=>elements.forEach(element=>element.style.minHeight=heights[index]+'px'));
  }
  let dailyWidth=-1;
  new ResizeObserver(entries=>{
    const width=entries[0].contentRect.width;
    if(Math.abs(width-dailyWidth)>.1){dailyWidth=width;alignDailyFields();}
  }).observe(dailyStage);
  alignDailyFields();document.fonts.ready.then(alignDailyFields);
  const newsRail=$('[data-news-rail]');
  if(newsRail){
    const cards=$$('[data-news-item]',newsRail),prev=$('[data-news-prev]'),next=$('[data-news-next]'),progress=$('[data-news-progress]');
    const step=()=>cards[0].getBoundingClientRect().width+parseFloat(getComputedStyle(newsRail).columnGap);
    function updateNews(){
      const stride=step(),first=Math.max(0,Math.min(cards.length-1,Math.round(newsRail.scrollLeft/stride)));
      const visible=Math.max(1,Math.round((newsRail.clientWidth+parseFloat(getComputedStyle(newsRail).columnGap))/stride));
      const last=Math.min(cards.length,first+visible),positions=Math.max(1,cards.length-visible+1);
      updateCarouselProgress(progress,Math.min(first+1,positions),positions,`Показаны новости с ${first+1} по ${last} из ${cards.length}`);
      prev.disabled=newsRail.scrollLeft<=1;
      next.disabled=newsRail.scrollLeft+newsRail.clientWidth>=newsRail.scrollWidth-2;
    }
    function moveNews(direction){
      const stride=step(),target=(Math.round(newsRail.scrollLeft/stride)+direction)*stride;
      newsRail.scrollTo({left:Math.max(0,Math.min(newsRail.scrollWidth-newsRail.clientWidth,target)),behavior:reduce.matches?'instant':'smooth'});
    }
    prev.addEventListener('click',()=>moveNews(-1));
    next.addEventListener('click',()=>moveNews(1));
    newsRail.addEventListener('scroll',updateNews,{passive:true});
    newsRail.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();moveNews(event.key==='ArrowRight'?1:-1);}
      if(event.key==='Home'||event.key==='End'){event.preventDefault();newsRail.scrollTo({left:event.key==='Home'?0:newsRail.scrollWidth,behavior:reduce.matches?'instant':'smooth'});}
    });
    new ResizeObserver(updateNews).observe(newsRail);
    updateNews();
  }
  // The template's ecosystem tabs, including keyboard navigation and motion.
  const ecosystemTabs=$$('#ecosystem [role=tab]');
  let ecosystemAnimation;
  function selectEcosystemTab(selected,focus=false){
    ecosystemAnimation?.cancel();
    ecosystemTabs.forEach(tab=>{
      const active=tab===selected;
      tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
      const panel=$('#'+tab.getAttribute('aria-controls'));panel.hidden=!active;
      if(active&&!reduce.matches)ecosystemAnimation=panel.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:230,easing:'ease-out'});
    });
    if(focus)selected.focus({preventScroll:true});
  }
  ecosystemTabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectEcosystemTab(tab));
    tab.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(index+1)%ecosystemTabs.length;
      else if(event.key==='ArrowLeft')next=(index+ecosystemTabs.length-1)%ecosystemTabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=ecosystemTabs.length-1;
      else return;
      event.preventDefault();selectEcosystemTab(ecosystemTabs[next],true);
    });
  });
  reduce.addEventListener('change',event=>{if(event.matches)ecosystemAnimation?.cancel();});
  // Match the template's accordion animation; native details work without JS.
  const faqState=new WeakMap();
  $$('#faq details').forEach(details=>{
    const summary=$('summary',details);
    faqState.set(details,{requestedOpen:details.open,animation:null});
    summary.addEventListener('click',event=>{
      event.preventDefault();
      const state=faqState.get(details);
      state.requestedOpen=!state.requestedOpen;
      const from=details.getBoundingClientRect().height;
      if(state.animation){state.animation.cancel();state.animation=null;}
      if(reduce.matches||typeof details.animate!=='function'){details.open=state.requestedOpen;return;}
      // Measure the actual grid row, including its stretched closed height.
      details.open=state.requestedOpen;
      const to=details.getBoundingClientRect().height;
      details.open=true;
      const animation=details.animate([{height:from+'px'},{height:to+'px'}],{duration:300,easing:'cubic-bezier(.22,1,.36,1)'});
      state.animation=animation;
      animation.onfinish=()=>{details.open=state.requestedOpen;state.animation=null;};
    });
  });
  reduce.addEventListener('change',event=>{
    if(event.matches)$$('#faq details').forEach(details=>{
      const state=faqState.get(details);
      if(state.animation){state.animation.cancel();state.animation=null;details.open=state.requestedOpen;}
    });
  });
  $('#block-cookie-form').hidden=safe.get('cookies',false);
  $$('a[target=_blank]').forEach(el=>el.rel='noopener');
  $$('#search-toggle,[data-cart-open],[data-favorites-open],[data-compare-open]').forEach(el=>el.setAttribute('aria-controls','client-dialog'));
  sync();document.fonts.ready.then(()=>fits.forEach(fitImage));
  // The template reveals collection headings and the whole panel frame once;
  // tab changes animate only the newly selected cards inside that frame.
  const contentReveals=$$([
    '#categories .section-heading','#categories .m-category-grid',
    '#daily-picks .m-section-heading','#daily-picks .m-daily-stage','#daily-picks .client-daily-footer',
    '#new .m-section-heading','#new .m-collection-panels',
    '#hits .m-section-heading','#hits .m-collection-panels',
    '.client-tab-campaign .tv-copy','#televisions .tv-copy',
    '#ecosystem .campaign-art','#ecosystem .campaign-copy',
    '#why-buy .section-title-row',
    '#why-buy .client-reasons-grid > a','#customer-reviews .section-title-row',
    '#customer-reviews .client-reviews-layout','#journal .section-title-row',
    '#journal .client-news-rail','#journal .client-news-footer',
    '#faq .faq-intro','#faq .faq-list'
  ].join(','));
  contentReveals.forEach(element=>element.classList.add('reveal'));
  let contentRevealObserver;
  if('IntersectionObserver' in window&&!reduce.matches){
    document.documentElement.classList.add('motion-ready');
    contentRevealObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('is-visible');contentRevealObserver.unobserve(entry.target);}
      });
    },{threshold:.06,rootMargin:'0px 0px -18px 0px'});
    contentReveals.forEach(element=>contentRevealObserver.observe(element));
  }
  reduce.addEventListener('change',event=>{
    if(event.matches){
      document.documentElement.classList.remove('motion-ready');
      contentRevealObserver?.disconnect();
      contentReveals.forEach(element=>element.classList.add('is-visible'));
    }
  });
  window.samsungHome={state,hero,daily,show,pause(){paused=true;autoplay();}};
})();
