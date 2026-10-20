const demo = document.querySelector('[data-soul-demo]');
if (demo) {
  const frame = demo.querySelector('soul-script-demo');
  const preview = demo.querySelector('.soul-demo-preview');
  const stage = preview.querySelector('.soul-demo-stage');
  const buttons = [...demo.querySelectorAll('[data-demo-page]')];
  const pages = new Set(buttons.map(button => button.dataset.demoPage));
  let desired = 'home';
  function select(page) {
    if (!pages.has(page)) return;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.demoPage === page)));
  }
  function navigate() { frame.navigate?.(desired); }
  buttons.forEach(button => button.addEventListener('click', () => {
    desired = button.dataset.demoPage;
    select(desired);
    navigate();
  }));
  function ready() {
    demo.dataset.demoStatus = 'ready';
    if (desired !== 'home') navigate();
  }
  frame.addEventListener('soul-demo-ready', ready);
  if (frame.dataset.status === 'ready') ready();
  frame.addEventListener('soul-demo-error', () => {
    demo.dataset.demoStatus = 'error';
    demo.querySelector('[data-demo-status]').textContent = '交互演示暂未加载，可先查看真实原型界面。';
  });
  frame.addEventListener('soul-demo-state', event => {
    let page = event.detail.page;
    if (page === 'detail' || page === 'search') page = 'home';
    select(page);
  });
  const fit = () => stage.style.setProperty('--soul-demo-scale', String(stage.clientWidth / 390));
  new ResizeObserver(fit).observe(stage);
  fit();
}
