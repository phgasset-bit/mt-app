// Sonido: efectos sintetizados con WebAudio + voces pregrabadas (audio/*.mp3, generadas con tools/gen_voices.sh)
const Snd = (() => {
  let ctx = null, master = null, nbuf = null, vol = 0.9;
  const buf = {};
  const VOCES = ['viva_espana','viva_legion','a_mi','adelante','asalto','fuego','granada','recargando','cubridme','enemigo',
    'herido','sanitario','tomada','aviacion','emboscada','coro_viva','coro_espana','coro_legion','coro_luchar','luchar','viva_espana_b','viva_legion_b','a_mi_b'];

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination);
    nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = nbuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    VOCES.forEach(n => {
      fetch('audio/' + n + '.mp3').then(r => r.arrayBuffer())
        .then(a => ctx.decodeAudioData(a, b => { buf[n] = b; }, () => {})).catch(() => {});
    });
    viento();
  }
  function setVol(v) { vol = v; if (master) master.gain.value = v; }

  function salida(pan) {
    if (ctx.createStereoPanner && pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(master); return p; }
    return master;
  }
  // ráfaga de ruido filtrado: base de disparos y explosiones
  function ruido(dur, f0, f1, g, pan, t0, tipo) {
    const t = ctx.currentTime + (t0 || 0);
    const s = ctx.createBufferSource(); s.buffer = nbuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = tipo || 'lowpass';
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const a = ctx.createGain(); a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(a); a.connect(salida(pan)); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  function tono(tipo, f0, f1, dur, g, pan, t0) {
    const t = ctx.currentTime + (t0 || 0);
    const o = ctx.createOscillator(); o.type = tipo;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const a = ctx.createGain(); a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(a); a.connect(salida(pan)); o.start(t); o.stop(t + dur + 0.02);
  }

  // tipo: 'mauser' | 'z45' | 'enemigo'; dist en metros; pan -1..1
  function disparo(tipo, dist, pan) {
    if (!ctx) return;
    dist = dist || 0;
    const g = 1 / (1 + dist / 22), ret = Math.min(0.5, dist / 340), lejos = Math.max(0.25, 1 - dist / 160);
    if (tipo === 'mauser') { ruido(0.34, 5200, 260, 1.1, 0, 0); tono('sine', 170, 45, 0.2, 0.9, 0, 0); ruido(0.7, 900, 120, 0.22, 0, 0.05); }
    else if (tipo === 'z45') { ruido(0.11, 3600, 500, 0.75, 0, 0); tono('square', 140, 60, 0.07, 0.3, 0, 0); }
    else { ruido(0.3, 4200 * lejos, 200, 0.9 * g, pan, ret); tono('sine', 150, 50, 0.16, 0.5 * g, pan, ret); ruido(0.6, 600, 100, 0.15 * g, pan, ret + 0.06); }
  }
  function cerrojo() { if (!ctx) return; ruido(0.035, 3200, 2400, 0.28, 0, 0.3, 'bandpass'); ruido(0.05, 2200, 1500, 0.3, 0, 0.62, 'bandpass'); }
  function clic() { if (ctx) ruido(0.03, 2800, 2000, 0.25, 0, 0, 'bandpass'); }
  function recarga() { if (!ctx) return; ruido(0.05, 1800, 1200, 0.3, 0, 0.2, 'bandpass'); ruido(0.08, 2600, 1500, 0.3, 0, 1.2, 'bandpass'); ruido(0.05, 3000, 2000, 0.3, 0, 2.0, 'bandpass'); }
  function silbido(pan) { if (ctx) ruido(0.16, 5200, 1200, 0.35, pan, 0, 'bandpass'); }
  function impacto() { if (!ctx) return; tono('sine', 110, 50, 0.18, 0.8, 0, 0); ruido(0.12, 900, 200, 0.5, 0, 0); }
  function explosion(dist, pan) {
    if (!ctx) return;
    const g = 1.6 / (1 + (dist || 0) / 40), r = Math.min(0.5, (dist || 0) / 340);
    ruido(1.5, 1400, 50, 1.3 * g, pan, r); tono('sine', 90, 28, 0.9, 1.2 * g, pan, r); ruido(0.2, 5000, 800, 0.6 * g, pan, r);
  }
  function avion() {
    if (!ctx) return;
    const t = ctx.currentTime, a = ctx.createGain();
    a.gain.setValueAtTime(0.001, t); a.gain.exponentialRampToValueAtTime(0.5, t + 3.5); a.gain.exponentialRampToValueAtTime(0.001, t + 8);
    a.connect(master);
    [82, 87, 164].forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.08, t); o.frequency.linearRampToValueAtTime(f * 0.9, t + 8);
      const lp = ctx.createBiquadFilter(); lp.frequency.value = 500; o.connect(lp); lp.connect(a); o.start(t); o.stop(t + 8.1); });
  }
  // toque de corneta: notas de la serie armónica, como una corneta de órdenes
  function corneta(tipo) {
    if (!ctx) return;
    const N = { g: 392, c: 523.25, e: 659.25, G: 783.99 };
    const toques = {
      ataque: ['c', .14, 'c', .14, 'c', .14, 'e', .42, 'c', .14, 'e', .14, 'G', .6, 'e', .14, 'G', .14, 'G', .14, 'G', .7],
      victoria: ['g', .2, 'c', .2, 'e', .2, 'G', .55, 'e', .2, 'G', .9],
      diana: ['g', .25, 'c', .5, 'g', .25, 'c', .5, 'e', .25, 'c', .25, 'g', .7]
    };
    const s = toques[tipo] || toques.ataque; let t = ctx.currentTime + 0.05;
    for (let i = 0; i < s.length; i += 2) {
      const d = s[i + 1], o = ctx.createOscillator(), a = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(N[s[i]] * 0.985, t); o.frequency.linearRampToValueAtTime(N[s[i]], t + 0.04);
      f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.9;
      a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(0.32, t + 0.03); a.gain.setValueAtTime(0.3, t + d * 0.8); a.gain.linearRampToValueAtTime(0.0001, t + d * 0.97);
      o.connect(f); f.connect(a); a.connect(master); o.start(t); o.stop(t + d); t += d;
    }
  }
  function viento() {
    const s = ctx.createBufferSource(); s.buffer = nbuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6;
    const a = ctx.createGain(); a.gain.value = 0.05;
    const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.13; lg.gain.value = 0.03; l.connect(lg); lg.connect(a.gain);
    s.connect(f); f.connect(a); a.connect(master); s.start(); l.start();
  }
  function voz(n, g, pan, t0) {
    if (!ctx || !buf[n]) return false;
    const s = ctx.createBufferSource(); s.buffer = buf[n];
    const a = ctx.createGain(); a.gain.value = g == null ? 1 : g;
    s.connect(a); a.connect(salida(pan || 0)); s.start(ctx.currentTime + (t0 || 0));
    return true;
  }
  return { init, setVol, disparo, cerrojo, clic, recarga, silbido, impacto, explosion, avion, corneta, voz, get listo() { return !!ctx; }, get cargadas() { return Object.keys(buf).length; } };
})();
