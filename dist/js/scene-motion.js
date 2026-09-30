/* Uploaded character performances and a scroll-driven Mothership study. */
(() => {
  'use strict';
  const mediaRoot = 'assets/motion/';
  let enabled = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const players = [];
  const allowed = () => enabled && !document.hidden;

  function makePlayer(video, image, container) {
    const player = { video, image, container, name: '', visible: false, failed: false };
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    const reveal = () => {
      if (video.readyState < 2 || player.failed) return;
      video.classList.add('is-ready');
      image.classList.add('is-video-covered');
    };
    video.addEventListener('loadeddata', reveal);
    video.addEventListener('playing', reveal);
    video.addEventListener('error', () => {
      player.failed = true;
      video.classList.remove('is-ready');
      image.classList.remove('is-video-covered');
    });
    player.sync = () => {
      if (!allowed() || !player.visible || player.failed) { video.pause(); return; }
      if (!video.getAttribute('src') && player.name) {
        video.src = mediaRoot + player.name + '.mp4';
        video.load();
      }
      if (video.paused) video.play().catch(() => { /* Poster remains when autoplay is unavailable. */ });
    };
    player.select = name => {
      if (player.name === name) return;
      video.pause();
      player.name = name;
      player.failed = false;
      video.classList.remove('is-ready');
      image.classList.remove('is-video-covered');
      video.removeAttribute('src');
      video.load();
      video.poster = mediaRoot + name + '-poster.jpg';
      video.playbackRate = name === 'the-one-above' ? .7 : .85;
      video.setAttribute('aria-label', name.replaceAll('-', ' ') + ' animated character study');
      player.sync();
    };
    const observer = new IntersectionObserver(entries => {
      player.visible = entries[0].isIntersecting;
      player.sync();
    }, { threshold: .05 });
    observer.observe(container);
    players.push(player);
    return player;
  }

  const hero = makePlayer(document.querySelector('#hero-video'), document.querySelector('#hero-poster'), document.querySelector('.ensemble-stage'));
  hero.select('hero-ensemble');
  hero.video.playbackRate = 1;
  hero.video.setAttribute('aria-label', 'The ten characters in an animated Story of the gods ensemble');
  const origin = makePlayer(document.querySelector('#origin-video'), document.querySelector('#origin-poster'), document.querySelector('#origin'));
  origin.select('origin-mothership');
  origin.video.playbackRate = 1;
  origin.video.setAttribute('aria-label', 'The Mothership and clouds moving above ancient Antarctica');
  const gallery = makePlayer(document.querySelector('#character-video'), document.querySelector('#character-image'), document.querySelector('.character-art'));
  const vision = makePlayer(document.querySelector('#solomon-video'), document.querySelector('#solomon-poster'), document.querySelector('.vision-art'));
  vision.select('solomon');

  const shipStage = document.querySelector('.mothership-film');
  const ship = document.querySelector('#mothership-video');
  const shipImage = shipStage.querySelector('img');
  let shipNear = false, shipVisible = false, target = 0, frame = 0, lastStamp = 0;
  ship.muted = true;
  ship.playsInline = true;

  function scrollTarget() {
    const r = shipStage.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight + r.height)));
    target = progress * Math.max(0, (ship.duration || 0) - 1 / 24);
    shipStage.style.setProperty('--film-progress', progress.toFixed(4));
    if (allowed() && shipVisible && ship.readyState >= 2 && !frame) frame = requestAnimationFrame(seek);
  }
  function seek(stamp) {
    frame = 0;
    if (!allowed() || !shipVisible || ship.readyState < 2) return;
    if (ship.seeking) return; // The seeked event picks up the latest scroll target.
    const difference = target - ship.currentTime;
    if (Math.abs(difference) < 1 / 30) return;
    const elapsed = Math.min(.1, (stamp - (lastStamp || stamp - 16)) / 1000);
    lastStamp = stamp;
    const next = ship.currentTime + difference * (1 - Math.exp(-elapsed / .09));
    ship.currentTime = Math.abs(difference) < .075 ? target : next;
  }
  ship.addEventListener('loadeddata', () => {
    ship.classList.add('is-ready');
    shipImage.classList.add('is-video-covered');
    scrollTarget();
  });
  ship.addEventListener('seeked', () => {
    if (allowed() && shipVisible && !frame) frame = requestAnimationFrame(seek);
  });
  ship.addEventListener('error', () => {
    ship.classList.remove('is-ready');
    shipImage.classList.remove('is-video-covered');
  });
  function syncShip() {
    if (allowed() && shipNear && !ship.getAttribute('src')) {
      ship.src = mediaRoot + 'mothership.mp4';
      ship.load();
    }
    if (!allowed()) { cancelAnimationFrame(frame); frame = 0; }
    else scrollTarget();
  }
  new IntersectionObserver(entries => {
    shipNear = entries[0].isIntersecting;
    syncShip();
  }, { rootMargin: '500px 0px' }).observe(shipStage);
  new IntersectionObserver(entries => {
    shipVisible = entries[0].isIntersecting;
    if (!shipVisible) { cancelAnimationFrame(frame); frame = 0; lastStamp = 0; }
    else scrollTarget();
  }).observe(shipStage);
  window.addEventListener('scroll', scrollTarget, { passive: true });
  window.addEventListener('resize', scrollTarget);
  document.addEventListener('visibilitychange', () => { players.forEach(p => p.sync()); syncShip(); });
  // A touch/click also retries playback when a browser initially declined autoplay.
  document.addEventListener('pointerdown', () => players.forEach(p => p.sync()), { passive: true });
  window.sceneMotion = {
    selectCharacter: name => gallery.select(name),
    setEnabled(value) { enabled = value; players.forEach(p => p.sync()); syncShip(); }
  };
})();
