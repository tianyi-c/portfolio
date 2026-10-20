// Compact explanations; click, hover and keyboard use the same controls.
(() => {
  const hints = [...document.querySelectorAll('.paper-system-hint')];
  let pinned = null;
  const show = item => hints.forEach(hint => {
    const open = hint === item;
    hint.querySelector('button').setAttribute('aria-expanded', String(open));
    hint.querySelector('p').hidden = !open;
  });
  hints.forEach(hint => {
    const button = hint.querySelector('button');
    button.addEventListener('click', () => { pinned = pinned === hint ? null : hint; show(pinned); });
    hint.addEventListener('pointerenter', event => { if(event.pointerType === 'mouse') show(hint); });
    hint.addEventListener('pointerleave', () => show(pinned));
    button.addEventListener('focus', () => show(hint));
    button.addEventListener('blur', () => show(pinned));
  });
  document.addEventListener('keydown', event => { if(event.key === 'Escape'){ pinned = null; show(null); } });
  document.addEventListener('click', event => { if(!event.target.closest('.paper-system-hint')){ pinned = null; show(null); } });
})();
