// ===================================================
// K-SOUNDRENTALS — Brand & Hero Backdrop Audio Visualizer
// ===================================================

export function initVisualizers() {
  injectBrandVisualizer();
  injectHeroBgVisualizer();
  startOrganicVisualizerLoop();
}

function injectBrandVisualizer() {
  const navLogos = document.querySelectorAll('.navbar .logo, .dash-sidebar-brand');
  navLogos.forEach((navLogo) => {
    if (!navLogo || navLogo.querySelector('.brand-eq')) return;

    const eq = document.createElement('span');
    eq.className = 'brand-eq';
    eq.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 5; i++) {
      const bar = document.createElement('i');
      bar.className = 'brand-eq-bar';
      eq.appendChild(bar);
    }
    navLogo.appendChild(eq);
  });
}

function injectHeroBgVisualizer() {
  const container = document.getElementById('hero-bg-visualizer');
  if (!container || container.children.length > 0) return;

  const totalBars = 28;
  for (let i = 0; i < totalBars; i++) {
    const bar = document.createElement('span');
    bar.className = 'hero-bg-eq-bar';
    container.appendChild(bar);
  }
}

function startOrganicVisualizerLoop() {
  const brandBars = Array.from(document.querySelectorAll('.brand-eq-bar'));
  const heroBars = Array.from(document.querySelectorAll('.hero-bg-eq-bar'));
  if (brandBars.length === 0 && heroBars.length === 0) return;

  const brandStates = brandBars.map(() => ({
    val: 0.25 + Math.random() * 0.55,
    target: 0.25 + Math.random() * 0.75,
    vel: 0,
    nextChange: performance.now() + Math.random() * 240
  }));

  // Give the hero backdrop bars a natural center-weighted envelope + organic random peaks
  const heroCount = heroBars.length;
  const heroStates = heroBars.map((_, idx) => {
    const norm = heroCount > 1 ? idx / (heroCount - 1) : 0.5;
    const distFromCenter = Math.abs(norm - 0.5) * 2; // 0 at center, 1 at edges
    const envelope = Math.max(0.32, 1 - distFromCenter * 0.62);
    return {
      envelope,
      val: 0.2 + Math.random() * 0.5,
      target: 0.3 + Math.random() * 0.6,
      vel: 0,
      nextChange: performance.now() + Math.random() * 200
    };
  });

  function animate(now) {
    // 1. Navbar brand bars
    for (let i = 0; i < brandBars.length; i++) {
      const st = brandStates[i];
      if (now >= st.nextChange) {
        st.target = 0.16 + Math.random() * 0.84;
        st.nextChange = now + 130 + Math.random() * 230;
      }
      const force = (st.target - st.val) * 0.18;
      st.vel = st.vel * 0.65 + force;
      st.val = Math.min(1, Math.max(0.14, st.val + st.vel));
      brandBars[i].style.transform = `scaleY(${st.val.toFixed(3)})`;
    }

    // 2. Hero backdrop visualizer bars behind the product images
    for (let i = 0; i < heroBars.length; i++) {
      const st = heroStates[i];
      if (now >= st.nextChange) {
        const rawPeak = 0.18 + Math.random() * 0.82;
        st.target = Math.max(0.14, rawPeak * st.envelope);
        st.nextChange = now + 110 + Math.random() * 210;
      }
      const force = (st.target - st.val) * 0.16;
      st.vel = st.vel * 0.68 + force;
      st.val = Math.min(1, Math.max(0.12, st.val + st.vel));
      heroBars[i].style.transform = `scaleY(${st.val.toFixed(3)})`;
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
