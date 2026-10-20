// Preserve normal link/button behavior and allow selecting the resume text.
document.querySelectorAll('[data-project-href]').forEach(entry=>{
  entry.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0)return;
    if(event.target.closest('a,button,input,select,textarea,label,[contenteditable="true"]'))return;
    if(window.getSelection()?.isCollapsed===false)return;
    const href=entry.dataset.projectHref;
    if(event.ctrlKey||event.metaKey||event.shiftKey)window.open(href,'_blank','noopener');
    else window.location.assign(href);
  });
});

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
if('IntersectionObserver'in window&&!reducedMotion.matches){const revealObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');revealObserver.unobserve(entry.target)}})},{threshold:.06});document.querySelectorAll('[data-reveal]').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){el.classList.add('will-reveal');revealObserver.observe(el)}});reducedMotion.addEventListener('change',e=>{if(e.matches){document.querySelectorAll('.will-reveal').forEach(el=>el.classList.add('revealed'));revealObserver.disconnect()}})}
