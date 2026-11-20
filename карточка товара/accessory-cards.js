/* The homepage component, with the product page's existing cart and variants. */
(() => {
 'use strict';
 const panel=document.querySelector('#accessories'),grid=panel?.querySelector('.home-preview-grid');if(!grid)return;
 const cards=[...grid.querySelectorAll('.m-product-card')],fits=[...grid.querySelectorAll('[data-fit-image]')];
 let frame,previousWidth;const geometry=new WeakMap();
 const referenceTitles=Object.entries(window.samsungChromeContent.products)
  .filter(([key])=>/^new-\d+-\d+$/.test(key)).map(([,product])=>product.title);
 function fitImage(box){
  const image=box.querySelector('img'),r=box.getBoundingClientRect();if(!image||!r.width||!r.height)return;
  const prev=geometry.get(box);if(prev&&prev.width===r.width&&prev.height===r.height)return;
  const b=JSON.parse(box.dataset.bounds),w=+image.getAttribute('width'),h=+image.getAttribute('height');
  const base=Math.min(r.width/w,r.height/h),scale=Math.min(r.width*.83/((b[2]-b[0])*base),r.height*.85/((b[3]-b[1])*base),5,1/base);
  box.style.setProperty('--fit-scale',scale);box.style.setProperty('--fit-x',(w/2-(b[0]+b[2])/2)*base*scale+'px');box.style.setProperty('--fit-y',(h/2-(b[1]+b[3])/2)*base*scale+'px');
  geometry.set(box,{width:r.width,height:r.height});
 }
 function align(){
  frame=null;const visible=cards.filter(c=>c.getClientRects().length);if(!visible.length)return;
  const columns=getComputedStyle(grid).gridTemplateColumns.split(/\s+/).length;
  // Match the homepage's title reserve, including its other product categories.
  const firstTitle=visible[0].querySelector('h3'),measure=firstTitle.cloneNode(false);
  measure.removeAttribute('id');measure.setAttribute('aria-hidden','true');measure.dataset.clientTitleMeasure='';
  Object.assign(measure.style,{position:'absolute',visibility:'hidden',pointerEvents:'none',width:firstTitle.getBoundingClientRect().width+'px',minHeight:'0',height:'auto'});
  firstTitle.after(measure);let referenceHeight=0;
  for(const title of referenceTitles){
   measure.style.setProperty('--client-measure-title', JSON.stringify(title));
   referenceHeight=Math.max(referenceHeight,measure.getBoundingClientRect().height);
  }
  measure.remove();
  for(let index=0;index<visible.length;index+=columns){
   const titles=visible.slice(index,index+columns).map(c=>c.querySelector('h3'));
   titles.forEach(t=>t.style.minHeight='0');const height=Math.ceil(Math.max(referenceHeight,...titles.map(t=>t.getBoundingClientRect().height)));titles.forEach(t=>t.style.minHeight=height+'px');
  }
  fits.forEach(fitImage);
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(align);};
 new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==previousWidth){previousWidth=width;schedule();}}).observe(grid);
 const photoObserver=new ResizeObserver(entries=>entries.forEach(e=>fitImage(e.target)));fits.forEach(box=>photoObserver.observe(box));
 new MutationObserver(schedule).observe(panel,{attributes:true,attributeFilter:['class']});document.fonts.ready.then(schedule);window.addEventListener('load',schedule);
 function sync(){
  const state=window.samsungOffline.getState();
  cards.forEach(card=>card.querySelectorAll('.favorite,.commerce_compare-link').forEach(button=>{
   const id=(button.dataset.offlineAction||'').match(/\/(\d+)/)?.[1],key=button.matches('.favorite')?'favorites':'compare',selected=state[key].includes(id);
   button.setAttribute('aria-pressed',String(selected));button.classList.toggle('active',selected);
  }));
 }
 cards.forEach(card=>{
  const button=card.querySelector('.inform-about-availability-submit');if(!button)return;
  button.addEventListener('click',event=>{
   event.preventDefault();event.stopImmediatePropagation();
   const dialog=window.samsungOffline.show('Сообщить о поступлении','<p>Уведомление о поступлении можно оформить на сайте магазина.</p><a class="btn btn--dark" target="_blank" rel="noopener">Открыть товар</a>');dialog.querySelector('a').href=card.querySelector('h3 a').href;
  },true);
 });
 window.addEventListener('samsung-offline-change',sync);sync();schedule();
})();
