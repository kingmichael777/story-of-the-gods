/* Sacred Seven page choreography. Anime.js 4.5.0; artwork remains the source of truth. */
(() => {
  'use strict';
  if (!window.anime) return; // The complete page stays readable if the library fails.
  const { animate, createTimeline, stagger } = window.anime;
  let enabled = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let orbitsVisible = false;
  const finite = new Set();
  const orbitAnimations = [];
  const seen = new WeakSet();
  const characterTargets = [...document.querySelectorAll(
    '#character-role, #character-name, #character-epithet, #character-description, .character-detail'
  )];
  let characterAnimation;

  function track(animation) {
    finite.add(animation);
    animation.onComplete = () => finite.delete(animation);
    return animation;
  }

  function revealCharacter() {
    if (characterAnimation) {
      characterAnimation.revert();
      finite.delete(characterAnimation);
    }
    if (!enabled) return;
    characterAnimation = track(animate(characterTargets, {
      opacity: [0, 1], y: [18, 0],
      duration: 680, delay: stagger(55), ease: 'outQuint'
    }));
  }

  // Each rotor lives inside an existing elliptical ring, preserving its perspective.
  document.querySelectorAll('.cosmic-rings i').forEach((ring, index) => {
    if (index > 2) return;
    const rotor = document.createElement('b');
    rotor.className = 'satellite-orbit';
    const satellite = document.createElement('span');
    satellite.className = 'orbital-satellite';
    rotor.append(satellite);
    ring.append(rotor);
    orbitAnimations.push(animate(rotor, {
      rotate: [index * 120, index * 120 + (index === 1 ? -360 : 360)],
      duration: 26000 + index * 9000,
      ease: 'linear', loop: true, autoplay: false
    }));
  });

  function syncOrbits() {
    orbitAnimations.forEach(animation => {
      if (enabled && orbitsVisible && !document.hidden) animation.resume();
      else animation.pause();
    });
  }
  const orbitStage = document.querySelector('.chronicle-visual');
  if (orbitStage) new IntersectionObserver(entries => {
    orbitsVisible = entries[0].isIntersecting;
    syncOrbits();
  }, { threshold: .05 }).observe(orbitStage);
  document.addEventListener('visibilitychange', syncOrbits);

  // Only hide an element once it actually enters the viewport. No-JS and failed
  // library loads therefore never leave the editorial content invisible.
  const revealObserver = new IntersectionObserver(entries => {
    const arriving = entries.filter(entry => entry.isIntersecting && !seen.has(entry.target));
    arriving.forEach(entry => { seen.add(entry.target); revealObserver.unobserve(entry.target); });
    if (!enabled || !arriving.length) return;
    track(animate(arriving.map(entry => entry.target), {
      opacity: [0, 1], y: [28, 0],
      duration: 1000, delay: stagger(65), ease: 'outQuint'
    }));
  }, { rootMargin: '0px 0px -5% 0px', threshold: 0 });
  document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));

  if (enabled) {
    track(createTimeline({ defaults: { ease: 'outQuint' } })
      .add('.hero-figure', { opacity: [0, 1], duration: 1450 }, 0)
      .add('.intro-item', {
        opacity: [0, 1], y: [24, 0], duration: 1100, delay: stagger(130)
      }, 300));
  }

  window.editorialMotion = {
    revealCharacter,
    setEnabled(value) {
      enabled = value;
      if (!enabled) {
        // Revert removes inline hiding/transforms, even during a fast tab change.
        finite.forEach(animation => animation.revert());
        finite.clear();
        characterAnimation?.revert();
        characterAnimation = null;
      }
      syncOrbits();
    }
  };
})();
