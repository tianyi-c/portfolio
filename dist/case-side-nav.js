// Keep the current section in sync with the same reading threshold as Voyah.
(()=>{
  const links=[...document.querySelectorAll('.agent-case .case-toc a')];
  const sections=links.map(link=>document.getElementById(link.hash.slice(1))).filter(Boolean);
  if(!sections.length)return;
  let frame=0;
  function update(){
    frame=0;
    const threshold=Math.min(innerHeight*.22,180);
    let active=sections[0];
    sections.forEach(section=>{if(section.getBoundingClientRect().top<=threshold)active=section});
    if(innerHeight+scrollY>=document.documentElement.scrollHeight-2)active=sections.at(-1);
    links.forEach(link=>{if(link.hash==='#'+active.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')});
  }
  window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(update)},{passive:true});
  window.addEventListener('resize',update);
  document.fonts.ready.then(update);update();
})();
