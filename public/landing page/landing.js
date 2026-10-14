const menuButton=document.querySelector('.menu-toggle');
const siteNav=document.querySelector('#landing-nav');
const navLinks=Array.from(document.querySelectorAll('#landing-nav a'));
function closeMenu(){if(!menuButton||!siteNav)return;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open navigation');siteNav.classList.remove('is-open');}
if(menuButton&&siteNav){menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation');siteNav.classList.toggle('is-open',open);});navLinks.forEach(link=>link.addEventListener('click',closeMenu));window.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});}
for(const image of document.querySelectorAll('img')){image.addEventListener('error',()=>image.closest('[data-image-frame]')?.classList.add('is-missing'),{once:true});}
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const photo=document.querySelector('.hero-photo');
let frame=0,targetY=0,stopped=false;
let pauseAnimations=()=>{},resumeAnimations=()=>{},cancelAnimations=()=>{};
function paint(){frame=0;if(stopped||!photo||reduced.matches||document.visibilityState!=='visible')return;photo.style.transform='translate3d(0,'+targetY+'px,0)';}
function onScroll(){if(!photo||reduced.matches||document.visibilityState!=='visible')return;targetY=Math.min(window.scrollY*.055,38);if(!frame)frame=requestAnimationFrame(paint);}
function onVisibility(){if(document.visibilityState==='hidden'){if(frame)cancelAnimationFrame(frame);frame=0;pauseAnimations();}else{resumeAnimations();onScroll();}}
if(!reduced.matches){window.addEventListener('scroll',onScroll,{passive:true});document.addEventListener('visibilitychange',onVisibility);import('/vendor/motion.js').then(({animate,inView})=>{if(stopped||reduced.matches)return;const controls=[];const track=control=>{controls.push(control);if(document.visibilityState==='hidden')control.pause();};pauseAnimations=()=>controls.forEach(control=>control.pause());resumeAnimations=()=>controls.forEach(control=>control.play());cancelAnimations=()=>controls.forEach(control=>control.cancel());document.querySelectorAll('[data-hero-enter]').forEach((element,index)=>track(animate(element,{opacity:[.74,1],y:[12,0]},{duration:.42,delay:index*.075,ease:[.22,1,.36,1]})));const reveal=Array.from(document.querySelectorAll('[data-reveal]'));inView(reveal,element=>track(animate(element,{opacity:[.76,1],y:[12,0]},{duration:.42,ease:[.22,1,.36,1]})),{margin:'0px 0px -8% 0px',amount:.12});}).catch(()=>{});}
window.addEventListener('pagehide',()=>{stopped=true;if(frame)cancelAnimationFrame(frame);cancelAnimations();},{once:true});
