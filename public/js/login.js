'use strict';
// Scales the 420px-wide envelope down to fit small screens.
document.addEventListener('DOMContentLoaded', () => {
  const scaleBox = document.getElementById('envelope-scale-box');
  const lockPanel = document.getElementById('lock-panel');
  const NATIVE_W = 420;

  function fitScale() {
    const sceneEl = document.getElementById('envelope-scene');
    const available = Math.min((sceneEl ? sceneEl.clientWidth : window.innerWidth) - 28, NATIVE_W);
    let ratio = available / NATIVE_W;
    if (!isFinite(ratio) || ratio <= 0) ratio = 1;
    ratio = Math.min(ratio, 1);
    if (scaleBox) scaleBox.style.transform = `scale(${ratio})`;
    if (lockPanel) {
      lockPanel.style.transform = `scale(${ratio})`;
      const panelH = lockPanel.offsetHeight || 160;
      lockPanel.style.marginTop = `${-(panelH * (1 - ratio)) * 0.5}px`;
    }
    if (scaleBox) {
      const boxH = 280;
      const lostH = boxH * (1 - ratio);
      scaleBox.style.marginBottom = `${-lostH * 0.5 + 8}px`;
    }
  }

  fitScale();
  window.addEventListener('resize', fitScale);
  window.addEventListener('orientationchange', () => setTimeout(fitScale, 100));
});
