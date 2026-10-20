(() => {
  const root = document.querySelector('.ota-player');
  if (!root) return;
  const videos = [...root.querySelectorAll('video')];
  const toggle = root.querySelector('.ota-toggle');
  const chapters = [...root.querySelectorAll('[data-clip]')];
  const seek = root.querySelector('.ota-seek');
  const current = root.querySelector('.ota-current');
  const totalLabel = root.querySelector('.ota-total');
  const message = root.querySelector('.ota-player-status');
  const heading = root.querySelector('.ota-current-heading');
  const headingNumber = root.querySelector('.ota-heading-number');
  const headingLabel = root.querySelector('.ota-heading-label');
  const copyHeadings = [...document.querySelectorAll('#experience .work-copy .detail h4')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const durations = videos.map(video => Number(video.dataset.duration));
  let active = 0, scrubbing = false, resumeAfterSeek = false;
  let headingIndex = -1;
  const GAP_MS = 3000;
  const FINAL_HOLD_MS = 4000, FADE_IN_MS = 800, FADE_OUT_MS = 1000;
  let inGap = false, gapTimer = null, gapRemaining = GAP_MS, gapStarted = 0;
  let fadeTimer = null, gapFade = null;
  const pendingTimes = new Map();
  const total = () => durations.reduce((sum, value) => sum + value, 0);
  const offset = index => durations.slice(0, index).reduce((sum, value) => sum + value, 0);
  const stamp = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  function render() {
    const video = videos[active];
    const elapsed = offset(active) + (pendingTimes.get(video) ?? video.currentTime);
    const playing = gapTimer !== null || (!video.paused && !video.ended);
    root.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-label', !inGap && video.ended && active === videos.length - 1 ? '重新播放' : playing ? '暂停视频' : '播放视频');
    chapters.forEach((button, index) => button.setAttribute('aria-pressed', String(index === active)));
    if (headingIndex !== active) {
      const firstHeading = headingIndex < 0;
      headingIndex = active;
      headingNumber.textContent = `0${active + 1} /`;
      headingLabel.textContent = copyHeadings[active].textContent.trim();
      copyHeadings.forEach((item, index) => item.classList.toggle('is-current-clip', index === active));
      heading.getAnimations?.().forEach(animation => animation.cancel());
      if (!firstHeading && !motion.matches && typeof heading.animate === 'function') {
        heading.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      }
    }
    seek.max = total();
    if (!scrubbing) seek.value = elapsed;
    seek.style.setProperty('--progress', `${Math.min(100, elapsed / total() * 100)}%`);
    seek.setAttribute('aria-valuetext', `第 0${active + 1} 段，${stamp(elapsed)}，共 ${stamp(total())}`);
    current.textContent = stamp(elapsed);
    totalLabel.textContent = stamp(total());
  }

  function setTime(video, seconds) {
    if (video.readyState >= 1) {
      video.currentTime = seconds;
      pendingTimes.delete(video);
    } else pendingTimes.set(video, seconds);
  }

  function play() {
    if (inGap) { startGap(); return; }
    const video = videos[active];
    message.hidden = true;
    const request = video.play();
    request?.catch(error => {
      if (video !== videos[active] || error.name === 'AbortError') return;
      if (error.name !== 'NotAllowedError') {
        message.textContent = '视频暂时无法播放，请重试';
        message.hidden = false;
      }
      render();
    });
  }

  function fadeVideo(video, visible) {
    video.getAnimations?.().forEach(animation => animation.cancel());
    video.style.opacity = motion.matches || visible ? '1' : '0';
    if (!motion.matches && typeof video.animate === 'function') {
      return video.animate([{ opacity: visible ? 0 : 1 }, { opacity: visible ? 1 : 0 }], {
        duration: visible ? FADE_IN_MS : FADE_OUT_MS,
        easing: 'cubic-bezier(.4,0,.2,1)'
      });
    }
    return null;
  }

  function select(index, seconds = 0, shouldPlay = false) {
    cancelGap();
    videos.forEach(video => video.pause());
    active = index;
    videos.forEach((video, i) => { video.hidden = i !== active; });
    setTime(videos[active], seconds);
    fadeVideo(videos[active], true);
    render();
    if (shouldPlay) play();
  }

  function cancelGap() {
    clearTimeout(gapTimer);
    clearTimeout(fadeTimer);
    gapFade?.cancel();
    fadeTimer = null;
    gapFade = null;
    gapTimer = null;
    inGap = false;
    gapRemaining = GAP_MS;
  }

  function pauseGap() {
    if (gapTimer !== null) {
      gapRemaining = Math.max(0, gapRemaining - (performance.now() - gapStarted));
      clearTimeout(gapTimer);
      clearTimeout(fadeTimer);
      fadeTimer = null;
      gapFade?.pause();
      gapTimer = null;
    }
    render();
  }

  function startGap() {
    if (gapTimer !== null) return;
    inGap = true;
    gapStarted = performance.now();
    if (gapFade) {
      if (!motion.matches) gapFade.play();
    } else {
      fadeTimer = setTimeout(() => {
        fadeTimer = null;
        gapFade = fadeVideo(videos[active], false);
      }, Math.max(0, gapRemaining - FADE_OUT_MS));
    }
    gapTimer = setTimeout(() => {
      gapTimer = null;
      if (!inGap || scrubbing) return;
      if (active < videos.length - 1) select(active + 1, 0, true);
      else { cancelGap(); render(); }
    }, gapRemaining);
    render();
  }

  function seekTo(seconds) {
    const target = Math.max(0, Math.min(total(), seconds));
    let index = 0;
    while (index < videos.length - 1 && target >= offset(index) + durations[index]) index++;
    select(index, target - offset(index));
  }

  videos.forEach((video, index) => {
    video.muted = true;
    video.loop = false;
    video.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(video.duration) && video.duration > 0) durations[index] = video.duration;
      if (pendingTimes.has(video)) setTime(video, pendingTimes.get(video));
      render();
    });
    ['timeupdate', 'play', 'pause', 'seeked'].forEach(event => video.addEventListener(event, render));
    video.addEventListener('ended', () => {
      if (index !== active || scrubbing) return;
      gapRemaining = active < videos.length - 1 ? GAP_MS : FINAL_HOLD_MS + FADE_OUT_MS;
      startGap();
    });
    video.addEventListener('error', () => {
      if (index !== active) return;
      message.textContent = '视频加载失败，请刷新后重试';
      message.hidden = false;
      render();
    });
  });

  toggle.addEventListener('click', () => {
    const video = videos[active];
    if (inGap) { gapTimer !== null ? pauseGap() : startGap(); }
    else if (!video.paused && !video.ended) video.pause();
    else if (video.ended && active === videos.length - 1) select(0, 0, true);
    else play();
  });
  chapters.forEach((button, index) => button.addEventListener('click', () => select(index, 0, true)));
  function beginSeek() {
    if (scrubbing) return;
    resumeAfterSeek = gapTimer !== null || (!videos[active].paused && !videos[active].ended);
    scrubbing = true;
    if (inGap) pauseGap();
    videos[active].pause();
  }
  function finishSeek() {
    if (!scrubbing) return;
    scrubbing = false;
    if (resumeAfterSeek) play();
    render();
  }
  seek.addEventListener('pointerdown', beginSeek);
  seek.addEventListener('input', () => { beginSeek(); seekTo(Number(seek.value)); });
  seek.addEventListener('change', finishSeek);
  seek.addEventListener('blur', finishSeek);
  window.addEventListener('pointerup', finishSeek);
  window.addEventListener('pointercancel', finishSeek);
  motion.addEventListener('change', event => { if (event.matches) { if (inGap) pauseGap(); videos[active].pause(); fadeVideo(videos[active], true); gapFade = null; } });
  render();
  fadeVideo(videos[active], true);
  if (!motion.matches) play();
})();
