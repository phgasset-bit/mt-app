// Motor de juego: jugador en primera persona, escuadra legionaria que avanza por saltos, IA enemiga, fases, HUD y mandos.
(() => {
  const $ = id => document.getElementById(id);
  const V3 = THREE.Vector3;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const H = (x, z) => World.height(x, z);
  const lin = World.lin;

  Humanos.cargar();
  // ---------- ajustes ----------
  const AJ = { sens: 1, vol: 0.9, auto: true, zurdo: false, dif: 1, calidad: 'alta', calAuto: true, invVuelo: false };
  try { Object.assign(AJ, JSON.parse(localStorage.getItem('ifni_aj') || '{}')); } catch (e) {}
  const guardarAJ = () => { try { localStorage.setItem('ifni_aj', JSON.stringify(AJ)); } catch (e) {} };

  // ---------- render ----------
  const canvas = $('c'), app = $('app');
  const tactil = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !tactil, powerPreference: 'high-performance' });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  function aplicaCalidad() { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, AJ.calidad === 'alta' ? (tactil ? 1.5 : 1.75) : 1)); renderer.shadowMap.enabled = AJ.calidad === 'alta'; try { scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); } catch (e) {} }
  aplicaCalidad();
  const cam = new THREE.PerspectiveCamera(72, 1, 0.05, 2400); cam.rotation.order = 'YXZ';
  let scene = new THREE.Scene();
  function redim() {
    const w = app.clientWidth || innerWidth, h = app.clientHeight || innerHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    $('gira').hidden = !(h > w && tactil);
  }
  addEventListener('resize', redim);
  if (!tactil) app.classList.add('raton');

  // ---------- arma en primera persona, brazos remangados y tatuaje ----------
  const vm = new THREE.Group(); cam.add(vm);
  const T = World.tex();
  const mMadera = new THREE.MeshLambertMaterial({ map: T.madera, color: lin(0xc9b08c), fog: false });
  const mMetal = new THREE.MeshPhongMaterial({ color: lin(0x2a2b2e), shininess: 70, specular: lin(0x6a6a6a), fog: false });
  const mMetal2 = new THREE.MeshPhongMaterial({ color: lin(0x45474a), shininess: 50, specular: lin(0x555555), fog: false });
  const mPiel = new THREE.MeshLambertMaterial({ color: lin(0xc8996f), fog: false });
  const mManga = new THREE.MeshLambertMaterial({ color: lin(0x7a7350), fog: false });
  const UP = new V3(0, 1, 0);
  function tubo(r1, r2, a, b, material, padre) {
    const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, d.length(), 12), material);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); padre.add(m); return m;
  }
  function pieza(geo, material, x, y, z, padre, rx) { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); if (rx) m.rotation.x = rx; padre.add(m); return m; }
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const Cy = (r, l, s) => { const g = new THREE.CylinderGeometry(r, r, l, s || 10); g.rotateX(Math.PI / 2); return g; };
  // pieza de madera con perfil lateral (z hacia el tirador, y hacia arriba) y canto redondeado
  function perfil(pts, grosor) {
    const sh = new THREE.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
    const ge = new THREE.ExtrudeGeometry(sh, { depth: grosor - 0.016, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 4 });
    ge.translate(0, 0, -(grosor - 0.016) / 2); ge.rotateY(-Math.PI / 2); return ge;
  }
  // mano en primera persona: palma, cuatro dedos que abrazan el arma y pulgar
  function manoFP(pos, lado, color) {
    const m = new THREE.MeshStandardMaterial({ color: lin(color), roughness: 0.7, fog: false }), h = new THREE.Group(); h.position.copy(pos);
    const palma = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), m); h.add(palma);
    const dedo = (x, y, z, rx, rz, l, r) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(r || 0.0095, (r || 0.0095) * 0.85, l, 6), m); d.position.set(x, y, z); d.rotation.set(rx, 0, rz); h.add(d); const p = new THREE.Mesh(new THREE.SphereGeometry((r || 0.0095) * 0.9, 6, 5), m); p.position.set(x - Math.sin(rz) * l / 2, y + Math.cos(rz) * Math.cos(rx) * l / 2, z + Math.sin(rx) * l / 2); h.add(p); };
    if (lado === 'I') { // sostiene el guardamanos por debajo: dedos subiendo por la derecha, pulgar por la izquierda
      palma.scale.set(0.04, 0.02, 0.052); palma.position.set(0.005, -0.012, 0);
      for (let i = 0; i < 4; i++) dedo(0.04, 0.012, -0.036 + i * 0.022, 0, -0.25, 0.055);
      dedo(-0.034, 0.012, -0.012, -0.5, 0.3, 0.05, 0.011);
    } else { // empuña la garganta de la culata: dedos por delante, pulgar cruzado por arriba
      palma.scale.set(0.03, 0.045, 0.036); palma.position.set(0.012, -0.005, 0.02);
      for (let i = 0; i < 3; i++) dedo(-0.022, -0.03 + i * 0.02, -0.012, 0, Math.PI / 2 - 0.15, 0.06);
      dedo(-0.02, 0.022, -0.045, 1.1, Math.PI / 2 - 0.3, 0.05); dedo(-0.012, 0.04, 0.0, 0, Math.PI / 2 + 0.25, 0.055, 0.011);
    }
    brazos.add(h); return h;
  }
  function modeloArma(id) {
    const g = new THREE.Group(); let muzz = -0.9, izq = -0.34;
    if (id === 'mauser') {
      g.add(new THREE.Mesh(perfil([[-0.56, -0.03], [-0.56, 0.022], [-0.05, 0.028], [0.06, 0.022], [0.15, 0.002], [0.24, -0.002], [0.5, 0.012], [0.505, -0.125], [0.47, -0.128], [0.24, -0.062], [0.17, -0.07], [0.1, -0.05], [0.02, -0.04]], 0.05), mMadera));
      pieza(B(0.058, 0.13, 0.012), mMetal, 0, -0.057, 0.508, g);
      pieza(B(0.012, 0.012, 0.11), mMetal2, 0, -0.058, 0.07, g); pieza(B(0.008, 0.03, 0.008), mMetal, 0, -0.07, 0.085, g);
      pieza(Cy(0.012, 0.52, 8), mMetal, 0, 0.032, -0.63, g);
      pieza(Cy(0.016, 0.2, 12), mMetal2, 0, 0.036, 0.02, g);
      pieza(Cy(0.006, 0.07, 6), mMetal, 0.04, 0.04, 0.09, g).rotation.set(0, Math.PI / 2, 0);
      pieza(new THREE.SphereGeometry(0.012, 8, 6), mMetal, 0.075, 0.035, 0.09, g);
      [-0.4, -0.18].forEach(z => pieza(Cy(0.034, 0.018, 10), mMetal2, 0, 0.005, z, g));
      pieza(B(0.006, 0.026, 0.012), mMetal, 0, 0.055, -0.86, g);
      pieza(B(0.03, 0.016, 0.03), mMetal, 0, 0.058, -0.1, g);
    } else if (id === 'astra' || id === 'star') {
      pieza(B(0.03, 0.036, id === 'star' ? 0.2 : 0.17), mMetal2, 0, 0.012, -0.06, g);
      pieza(Cy(0.011, id === 'star' ? 0.05 : 0.09, 8), mMetal, 0, 0.014, id === 'star' ? -0.18 : -0.19, g);
      pieza(B(0.03, 0.022, 0.12), mMetal, 0, -0.016, -0.03, g);
      g.add(new THREE.Mesh(perfil([[-0.005, -0.02], [0.05, -0.02], [0.075, -0.125], [0.03, -0.13]], 0.034), mMadera));
      pieza(B(0.006, 0.012, 0.006), mMetal, 0, 0.036, -0.14, g); pieza(B(0.012, 0.01, 0.006), mMetal, 0, 0.035, 0.03, g);
      pieza(B(0.006, 0.03, 0.05), mMetal, 0, -0.045, -0.035, g);
      muzz = -0.24; izq = 0.06;
    } else if (id === 'z45' || id === 'naranjero') {
      const nar = id === 'naranjero';
      pieza(Cy(0.022, 0.36, 12), mMetal, 0, 0.012, -0.13, g);
      pieza(Cy(0.028, 0.2, 10), mMetal2, 0, 0.012, -0.38, g);
      for (let i = 0; i < 4; i++) pieza(B(0.058, 0.012, 0.02), mMetal, 0, 0.012, -0.32 - i * 0.04, g);
      if (nar) pieza(B(0.2, 0.035, 0.05), mMetal, -0.12, 0.0, -0.12, g);
      else pieza(B(0.032, 0.2, 0.05), mMetal, 0, -0.11, -0.16, g);
      pieza(B(0.052, 0.07, nar ? 0.42 : 0.18), mMadera, 0, -0.035, nar ? 0.18 : 0.08, g);
      pieza(B(0.056, 0.11, 0.24), mMadera, 0, -0.06, nar ? 0.42 : 0.3, g);
      pieza(B(0.006, 0.025, 0.012), mMetal, 0, 0.045, -0.47, g);
      muzz = -0.5; izq = nar ? -0.3 : -0.3;
    } else if (id === 'fao') {
      pieza(Cy(0.018, 0.7, 10), mMetal, 0, 0.03, -0.6, g);
      pieza(Cy(0.03, 0.3, 12), mMetal2, 0, 0.03, -0.1, g);
      pieza(B(0.04, 0.16, 0.06), mMetal, 0, 0.13, -0.08, g).rotation.x = 0.3;
      pieza(B(0.056, 0.13, 0.32), mMadera, 0, -0.04, 0.3, g);
      pieza(B(0.03, 0.08, 0.04), mMadera, 0, -0.07, 0.06, g);
      pieza(Cy(0.008, 0.3, 6), mMetal, -0.02, -0.0, -0.55, g); pieza(Cy(0.008, 0.3, 6), mMetal, 0.02, -0.0, -0.55, g);
      pieza(B(0.05, 0.045, 0.2), mMadera, 0, 0.0, -0.33, g);
      muzz = -0.96; izq = -0.33;
    } else {
      pieza(Cy(0.024, 0.4, 12), mMetal2, 0, 0.03, -0.12, g);
      pieza(Cy(0.012, 0.6, 8), mMetal, 0, 0.022, -0.5, g);
      pieza(Cy(0.014, 0.42, 8), mMetal, 0, 0.06, -0.38, g);
      pieza(B(0.05, 0.06, 0.22), mMadera, 0, 0.0, -0.4, g);
      pieza(B(0.03, 0.17, 0.05), mMetal, 0, -0.1, -0.12, g).rotation.x = -0.15;
      pieza(B(0.05, 0.1, 0.3), mMadera, 0, 0.0, 0.25, g);
      pieza(B(0.03, 0.08, 0.04), mMetal, 0, -0.06, 0.05, g);
      pieza(Cy(0.02, 0.05, 10), mMetal, 0, 0.022, -0.82, g);
      muzz = -0.86; izq = -0.4;
    }
    return { g, muzz, izq };
  }
  // ametralladora ALFA mod. 44 sobre trípode, con la cinta entrando por la izquierda
  const mLaton = new THREE.MeshPhongMaterial({ color: lin(0xb8913a), shininess: 60, specular: lin(0x886633), fog: false });
  const mOliva = new THREE.MeshLambertMaterial({ color: lin(0x4b4f38), fog: false });
  function modeloMG() {
    const g = new THREE.Group();
    pieza(B(0.09, 0.11, 0.42), mMetal, 0, 0, 0.05, g);
    pieza(B(0.1, 0.03, 0.22), mMetal2, 0, 0.07, 0.04, g);
    pieza(Cy(0.026, 0.62, 10), mMetal, 0, 0.01, -0.45, g);
    for (let i = 0; i < 11; i++) pieza(Cy(0.042, 0.012, 12), mMetal2, 0, 0.01, -0.2 - i * 0.045, g);
    pieza(Cy(0.034, 0.1, 10), mMetal, 0, 0.01, -0.8, g);
    pieza(B(0.006, 0.04, 0.012), mMetal, 0, 0.06, -0.62, g);
    pieza(B(0.035, 0.12, 0.05), mMadera, 0, -0.1, 0.17, g, 0.25);
    pieza(B(0.05, 0.09, 0.26), mMadera, 0, -0.03, 0.39, g);
    for (let i = 0; i < 9; i++) { const c = pieza(B(0.07, 0.013, 0.013), mLaton, -0.08 - i * 0.028, -0.01 - i * i * 0.0035, -0.02, g); c.rotation.z = -i * 0.07; }
    pieza(B(0.12, 0.16, 0.26), mOliva, -0.33, -0.25, -0.05, g);
    tubo(0.016, 0.016, new V3(0, -0.06, -0.12), new V3(-0.3, -0.75, -0.45), mMetal, g);
    tubo(0.016, 0.016, new V3(0, -0.06, -0.12), new V3(0.3, -0.75, -0.45), mMetal, g);
    tubo(0.016, 0.016, new V3(0, -0.06, -0.05), new V3(0, -0.8, 0.35), mMetal, g);
    g.visible = false; return { g, muzz: -0.86 };
  }
  const mg = modeloMG(); vm.add(mg.g);
  function paracaidas(color) {
    const g = new THREE.Group(), a0 = Math.PI * 0.42, R = 3.6, rim = R * Math.sin(a0), yTop = 6.2;
    const cup = new THREE.Mesh(new THREE.SphereGeometry(R, 18, 7, 0, Math.PI * 2, 0, a0), new THREE.MeshLambertMaterial({ color: lin(color), emissive: lin(color).multiplyScalar(0.45), side: THREE.DoubleSide }));
    cup.scale.y = 0.55; cup.position.y = yTop - R * 0.55; cup.castShadow = true; g.add(cup);
    const yRim = cup.position.y + R * 0.55 * Math.cos(a0), pts = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; pts.push(new V3(0, 1.75, 0), new V3(Math.cos(a) * rim, yRim, Math.sin(a) * rim)); }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x3a3a32 })));
    return g;
  }
  const brazos = new THREE.Group(); vm.add(brazos);
  let texTat = null;
  // antebrazo esculpido colocado de la muñeca (en el arma) hacia el codo (fuera de pantalla)
  let matAnte = null;
  function antebrazoEsculpido(lado, mano, codo, pulgar, paleta) {
    const J = Humanos.man.juntas, W = new V3(...J['muneca' + lado]), E = new V3(...J['codo' + lado]);
    const as = E.clone().sub(W).normalize(), bs = new V3(0, 0, -1).addScaledVector(as, -as.z * -1).projectOnPlane(as).normalize();
    const at = codo.clone().sub(mano).normalize(), bt = pulgar.clone().projectOnPlane(at).normalize();
    const Ms = new THREE.Matrix4().makeBasis(as, bs, new V3().crossVectors(as, bs)), Mt = new THREE.Matrix4().makeBasis(at, bt, new V3().crossVectors(at, bt));
    const R = Mt.multiply(Ms.transpose());
    const m = new THREE.Matrix4().makeTranslation(mano.x, mano.y, mano.z).multiply(R).multiply(new THREE.Matrix4().makeTranslation(-W.x, -W.y, -W.z));
    matAnte = matAnte || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, fog: false });
    const malla = new THREE.Mesh(Humanos.geometria('antebrazo' + lado, paleta), matAnte);
    malla.matrixAutoUpdate = false; malla.matrix.copy(m); malla.frustumCulled = false; brazos.add(malla);
    return { m, W, E };
  }
  function construyeBrazos(izqZ, tat) {
    while (brazos.children.length) brazos.remove(brazos.children[0]);
    if (Humanos.listo) {
      const paleta = Humanos.paletaAvatar(Progreso.P.avatar);
      const hI = new V3(-0.01, -0.07, izqZ), cI = new V3(-0.16, -0.42, 0.14), hD = new V3(0.025, -0.1, 0.17), cD = new V3(0.16, -0.42, 0.42);
      const iz = antebrazoEsculpido('I', hI, cI, new V3(0.3, 0.6, -1), paleta);
      antebrazoEsculpido('D', hD, cD, new V3(-0.4, 1, -0.4), paleta);
      manoFP(new V3(hI.x, hI.y + 0.035, hI.z - 0.02), 'I', paleta[0]); manoFP(new V3(hD.x - 0.012, hD.y + 0.04, hD.z - 0.03), 'D', paleta[0]);
      if (tat && tat !== 'ninguno') {
        const c = document.createElement('canvas'); c.width = 128; c.height = 128;
        Progreso.dibujaTatuaje(tat, c.getContext('2d'), 64, 64, 1.45);
        if (texTat) texTat.dispose(); texTat = new THREE.CanvasTexture(c); texTat.encoding = THREE.sRGBEncoding;
        const p = iz.W.clone().lerp(iz.E, 0.45).applyMatrix4(iz.m), eje = cI.clone().sub(hI).normalize();
        const z = new V3(-0.22, 0.22, 0.42).sub(p).normalize(), y = eje.clone().addScaledVector(z, -eje.dot(z)).normalize(), x = new V3().crossVectors(y, z);
        const dec = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshLambertMaterial({ map: texTat, transparent: true, fog: false, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
        dec.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); dec.position.copy(p).addScaledVector(z, 0.04); brazos.add(dec);
      }
      return;
    }
    const hI = new V3(-0.005, -0.05, izqZ), cI = new V3(-0.2, -0.32, 0.1), hD = new V3(0.02, -0.07, 0.15), cD = new V3(0.13, -0.31, 0.12);
    tubo(0.046, 0.036, cI, hI, mPiel, brazos); tubo(0.062, 0.058, cI.clone().add(new V3(-0.06, -0.1, 0.12)), cI, mManga, brazos);
    tubo(0.048, 0.037, cD, hD, mPiel, brazos);
    tubo(0.064, 0.06, cD.clone().add(new V3(0.05, -0.1, 0.14)), cD, mManga, brazos);
    pieza(new THREE.SphereGeometry(0.036, 10, 8), mPiel, hI.x, hI.y - 0.01, hI.z, brazos).scale.set(1.1, 0.8, 1.4);
    pieza(new THREE.SphereGeometry(0.036, 10, 8), mPiel, hD.x, hD.y - 0.01, hD.z, brazos).scale.set(1.1, 0.8, 1.4);
    if (!tat || tat === 'ninguno') return;
    // calcomanía del tatuaje sobre la cara visible del antebrazo derecho
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    Progreso.dibujaTatuaje(tat, c.getContext('2d'), 64, 64, 1.45);
    if (texTat) texTat.dispose(); texTat = new THREE.CanvasTexture(c); texTat.encoding = THREE.sRGBEncoding;
    const brazo = hI.clone().sub(cI), p = cI.clone().addScaledVector(brazo, 0.74);
    const camLocal = new V3(-0.22, 0.22, 0.42), z = camLocal.clone().sub(p).normalize();
    const eje = brazo.clone().normalize(), y = eje.clone().addScaledVector(z, -eje.dot(z)).normalize(), x = new V3().crossVectors(y, z);
    const dec = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.075), new THREE.MeshLambertMaterial({ map: texTat, transparent: true, fog: false, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
    dec.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    dec.position.copy(p).addScaledVector(z, 0.05); brazos.add(dec);
  }
  const fogonazo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.fogon, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  fogonazo.scale.set(0.35, 0.35, 0.35); fogonazo.visible = false; vm.add(fogonazo);
  const luzDisparo = new THREE.PointLight(0xffc870, 0, 18, 2); cam.add(luzDisparo); luzDisparo.position.set(0, 0, -1);

  // ---------- estado ----------
  let G = null, pausado = true, jugando = false, misionIdx = 0, ARMAS = [], modelos = [];
  const P = { pos: new V3(), yaw: 0, pitch: 0, vida: 100, curas: 2, agach: false, mira: false, arma: 0, granadas: 3, avion: 0, muerto: false, esJugador: true, team: 'L', mov: 0, bob: 0, retroceso: 0 };
  const mov = { x: 0, y: 0 }, teclas = {};
  let disparando = false;
  const NOMBRES = ['Rivas', 'Castro', 'Ortega', 'Mendizábal', 'Ferrer', 'Quesada', 'Barrios', 'Lozano', 'Aranda'];

  function equiparArmas() {
    modelos.forEach(m => vm.remove(m.g));
    const E = Progreso.P.equipo, ids = [E.p].concat(E.s && E.s !== E.p ? [E.s] : []);
    ARMAS = ids.map(id => Object.assign({ id }, Progreso.ARMAS[id], { mun: Progreso.ARMAS[id].carg }));
    modelos = ids.map(id => { const m = modeloArma(id); m.g.visible = false; vm.add(m.g); return m; });
    construyeBrazos(modelos[0].izq, E.tat);
  }

  // ---------- partículas y trazadoras ----------
  const efectos = [], trazas = [];
  const geoTraza = new THREE.BoxGeometry(0.025, 0.025, 2.2), matTraza = new THREE.MeshBasicMaterial({ color: lin(0xffd27a), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  function trazadora(de, a) {
    const d = a.clone().sub(de), L = d.length(); if (L < 4) return;
    const m = new THREE.Mesh(geoTraza, matTraza); m.position.copy(de); m.lookAt(a); scene.add(m);
    trazas.push({ m, dir: d.divideScalar(L), L, t: 0 });
  }
  function particula(pos, color, tam, vida, crece, vy, aditivo) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: aditivo ? T.fogon : T.humo, color: lin(color), transparent: true, depthWrite: false, blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending }));
    sp.position.copy(pos); sp.scale.setScalar(tam); sp.material.rotation = Math.random() * 6; scene.add(sp);
    efectos.push({ sp, t: 0, vida, tam, crece, vy: vy || 0, adit: !!aditivo });
  }
  function polvo(p, n, tam) { for (let i = 0; i < (n || 2); i++) particula(p.clone().add(new V3(rnd(-.2, .2), rnd(0, .3), rnd(-.2, .2))), 0xc9a982, tam || 0.55, rnd(0.6, 1.1), 1.8, 0.45); }
  // sangre: bruma roja, gotas que caen y dejan mancha, y charco bajo los caídos
  const texMancha = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r = Math.random() * (i < 8 ? 9 : 22), s = i < 8 ? 9 + Math.random() * 8 : 1.5 + Math.random() * 4.5; const gr = x.createRadialGradient(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 0, 32 + Math.cos(a) * r, 32 + Math.sin(a) * r, s); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }
    return new THREE.CanvasTexture(c);
  })();
  const geoMancha = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), geoGota = new THREE.SphereGeometry(0.022, 5, 4), matGota = new THREE.MeshBasicMaterial({ color: lin(0x5c0808) });
  const gotas = [], manchas = [], charcos = [];
  function mancha(x, z, tam, crece) {
    const m = new THREE.Mesh(geoMancha, new THREE.MeshBasicMaterial({ map: texMancha, color: lin(0x4f0707), transparent: true, opacity: 0.88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    const y = H(x, z); m.position.set(x, y + 0.03, z); m.rotation.y = Math.random() * 6.28;
    m.rotation.x = (H(x, z + 0.6) - H(x, z - 0.6)) / 1.2; m.rotation.z = -(H(x + 0.6, z) - H(x - 0.6, z)) / 1.2;
    m.scale.setScalar(crece ? 0.15 : tam); m.renderOrder = 2; scene.add(m); manchas.push(m);
    if (crece) charcos.push({ m, tam, t: 0 });
    if (manchas.length > 70) { const v = manchas.shift(); scene.remove(v); v.material.dispose(); }
  }
  function sangre(p, dir, fuerte) {
    particula(p, 0x7a0d0d, fuerte ? 0.55 : 0.4, 0.38, 1.6, -0.5);
    const n = fuerte ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geoGota, matGota); m.position.copy(p); m.scale.setScalar(rnd(0.6, 1.6)); scene.add(m);
      const v = new V3(rnd(-1.6, 1.6), rnd(0.5, 3), rnd(-1.6, 1.6)); if (dir) v.addScaledVector(dir, rnd(1.5, 4.5));
      gotas.push({ m, v });
    }
  }
  function actualizaSangre(dt) {
    for (let i = fuegos.length - 1; i >= 0; i--) { const f = fuegos[i]; f.t -= dt; f.n -= dt; if (f.t <= 0) { fuegos.splice(i, 1); continue; }
      if (f.n <= 0) { f.n = 0.12; const q = f.p.clone().add(new V3(rnd(-3, 3), rnd(0.2, 1), rnd(-3, 3))); particula(q, 0xff8a28, rnd(1.5, 3), rnd(0.4, 0.8), 1.2, 2.2, true); if (Math.random() < 0.5) particula(q.clone().add(new V3(0, 2, 0)), 0x2a2622, rnd(2.5, 4.5), rnd(2, 3.5), 2, 2.6); } }
    for (let i = gotas.length - 1; i >= 0; i--) {
      const g = gotas[i]; g.v.y -= 9.8 * dt; g.m.position.addScaledVector(g.v, dt);
      if (g.m.position.y <= H(g.m.position.x, g.m.position.z) + 0.02) { scene.remove(g.m); gotas.splice(i, 1); if (!g.seco && Math.random() < 0.7) mancha(g.m.position.x, g.m.position.z, rnd(0.12, 0.38)); }
    }
    for (let i = charcos.length - 1; i >= 0; i--) { const c = charcos[i]; c.t += dt; const k = Math.min(1, c.t / 5); c.m.scale.setScalar(0.15 + (c.tam - 0.15) * (1 - (1 - k) * (1 - k))); if (k >= 1) charcos.splice(i, 1); }
  }
  const fuegos = [];
  function explosionGrande(p) {
    fuegos.push({ p: p.clone(), t: 9, n: 0 });
    particula(p.clone().add(new V3(0, 2, 0)), 0xfff0b0, 16, 0.35, 1.6, 0, true);
    for (let i = 0; i < 6; i++) particula(p.clone().add(new V3(rnd(-4, 4), rnd(1, 5), rnd(-4, 4))), 0xff9a30, rnd(5, 9), rnd(0.35, 0.7), 1.5, 3, true);
    for (let i = 0; i < 16; i++) particula(p.clone().add(new V3(rnd(-5, 5), rnd(0, 3), rnd(-5, 5))), i % 3 ? 0x8f7a5c : 0x2e2822, rnd(4, 8), rnd(2.5, 5), 2.4, rnd(1, 3.5));
    for (let i = 0; i < 9; i++) particula(p.clone().add(new V3(rnd(-2, 2), 3 + i * 2.6, rnd(-2, 2))), 0x3a332c, rnd(5, 8), rnd(4, 7), 1.8, rnd(2.5, 4.5));
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(geoGota, World.mat(0x6b5a44)); m.scale.setScalar(rnd(4, 11)); m.position.copy(p).add(new V3(0, 0.5, 0)); scene.add(m); gotas.push({ m, v: new V3(rnd(-11, 11), rnd(8, 20), rnd(-11, 11)), seco: true }); }
    const c = new THREE.Mesh(geoMancha, new THREE.MeshBasicMaterial({ map: texMancha, color: lin(0x241d17), transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    c.position.set(p.x, H(p.x, p.z) + 0.04, p.z); c.scale.setScalar(13); c.rotation.y = Math.random() * 6; scene.add(c);
  }
  function explosionFx(p) {
    particula(p.clone().add(new V3(0, 1, 0)), 0xffd890, 6, 0.28, 2, 0, true);
    for (let i = 0; i < 12; i++) particula(p.clone().add(new V3(rnd(-2, 2), rnd(0, 2), rnd(-2, 2))), i < 4 ? 0x3a3128 : 0x9a8668, rnd(2, 4), rnd(1.8, 3.4), 2.2, rnd(0.5, 2.2));
  }
  function actualizaEfectos(dt) {
    for (let i = efectos.length - 1; i >= 0; i--) {
      const e = efectos[i]; e.t += dt; const k = e.t / e.vida;
      if (k >= 1) { scene.remove(e.sp); e.sp.material.dispose(); efectos.splice(i, 1); continue; }
      e.sp.scale.setScalar(e.tam * (1 + e.crece * k)); e.sp.material.opacity = (1 - k) * (e.adit ? 1 : 0.8); e.sp.position.y += e.vy * dt;
    }
    for (let i = trazas.length - 1; i >= 0; i--) {
      const t = trazas[i]; t.t += dt * 320; t.m.position.addScaledVector(t.dir, dt * 320);
      if (t.t >= t.L) { scene.remove(t.m); trazas.splice(i, 1); }
    }
  }

  // ---------- gritos ----------
  let gritoT = 0;
  function cartel(txt) { const el = $('grito'); el.textContent = txt; el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver'); }
  let avisoT = 0;
  function aviso(txt, s) { const el = $('aviso'); el.textContent = txt; el.style.opacity = 1; avisoT = s || 3; }
  function voz(clave, txt, g, pan, t0) { Snd.voz(clave, g, pan, t0); if (txt) cartel(txt); }
  function gritoViva() {
    if (!G || G.vivaCD > 0) return;
    const esp = G.vivaN++ % 2 === 0;
    voz(esp ? 'viva_espana' : 'viva_legion', esp ? '¡VIVA ESPAÑA!' : '¡VIVA LA LEGIÓN!');
    setTimeout(() => { if (G) { Snd.voz('coro_viva', 1); cartel('¡VIVA!'); } }, 1150);
    G.viva = 15; G.vivaCD = 22;
    aviso('Moral alta: la escuadra se lanza adelante y el enemigo se agacha', 3);
  }
  function gritoAliado(s) {
    const vivos = G.sold.filter(x => x.team === 'L' && !x.muerto); if (!vivos.length) return;
    s = s || vivos[Math.floor(Math.random() * vivos.length)];
    const op = [['viva_legion_b', '¡VIVA LA LEGIÓN!'], ['a_mi_b', '¡A MÍ LA LEGIÓN!'], ['viva_espana_b', '¡VIVA ESPAÑA!'], ['fuego', null], ['cubridme', null], ['coro_legion', '¡VIVA LA LEGIÓN!']];
    const o = op[Math.floor(Math.random() * op.length)];
    voz(o[0], o[1], 0.75, panDe(s.pos));
  }

  // ---------- soldados ----------
  function crearSoldado(team, x, z, k, extra) {
    const m = World.soldado(team, k, extra && extra.av);
    const s = Object.assign({ team, ...m, pos: new V3(x, H(x, z), z), yaw: 0, vida: team === 'L' ? 100 : 60, muerto: false, agach: false, estado: 'idle', t: rnd(0, 2), tirT: rnd(1, 3), visT: rnd(0, 0.8), obj: null, alerta: false, anim: Math.random() * 6, mueve: false, dest: null, cad: rnd(2.6, 4.2), muertoT: 0, rafaga: 0, apunta: 0, ciclo: Math.random() * 4, polvoT: 0 }, extra || {});
    scene.add(m.g); G.sold.push(s); return s;
  }
  function panDe(p) { const rel = Math.atan2(-(p.x - P.pos.x), -(p.z - P.pos.z)) - P.yaw; return clamp(-Math.sin(rel), -1, 1); }
  function dist2D(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  const _o = new V3(), _d = new V3();
  function ojo(s, out) { return out.set(s.pos.x, s.pos.y + (s.agach ? 1.05 : 1.6), s.pos.z); }
  function puedeVer(a, b) {
    ojo(a, _o); _d.set(b.pos.x, b.pos.y + (b.agach ? 1.0 : 1.4), b.pos.z).sub(_o);
    const L = _d.length(); if (L > 190) return false; _d.divideScalar(L);
    return World.obstaculo(_o, _d, L) >= L - 0.7;
  }
  function boca(s) { return new V3(s.pos.x - Math.sin(s.yaw) * 0.85, s.pos.y + (s.agach ? 1.0 : 1.42), s.pos.z - Math.cos(s.yaw) * 0.85); }

  function herir(s, dmg, desde, porJugador, cabeza) {
    if (s.muerto || s.aire) return;
    if (s.esJugador) {
      if (G.vuelo) return;
      if (G.caza) { dmg *= 0.45; if (P.vida - dmg <= 0 && !G.caza.suelo && !G.caza.aterrizando && !G.caza.caido) { $('dano').style.opacity = 0.9; Snd.impacto(); return derriboCaza('¡Te han dado! Motor en llamas: saltas en paracaídas'); } }
      if (G.carro) dmg *= 0.3;
      P.vida -= dmg; G.minVida = Math.min(G.minVida, P.vida); Snd.impacto(); $('dano').style.opacity = clamp(dmg / 40, 0.35, 0.9);
      const rel = Math.atan2(-(desde.x - P.pos.x), -(desde.z - P.pos.z)) - P.yaw;
      const d = $('dir'); d.style.transform = 'rotate(' + (-rel) + 'rad)'; d.style.opacity = 1; G.dirT = 1.2;
      if (P.vida <= 0) { P.vida = 0; P.muerto = true; G.finT = 2.5; aviso('Has caído', 4); }
      return;
    }
    if (s.herido > 0) return;
    s.vida -= dmg;
    if (s.vida <= 0 && s.team === 'L' && !s.heridoYa && !s.elev && dmg < 500 && Math.random() < 0.6) { // cae herido: se le puede salvar
      s.heridoYa = true; s.herido = 45; s.venda = 0; s.vida = 1; s.obj = null;
      voz(Math.random() < 0.5 ? 'herido' : 'sanitario', null, 0.9, panDe(s.pos)); aviso('¡' + s.nombre + ' está herido! Llega hasta él para vendarlo', 3.5); return;
    }
    if (s.vida <= 0) {
      if (s.jefe) { // sin su jefe, la partida se desbanda
        let n = 0; for (const e of G.sold) if (e.team === 'E' && !e.muerto && e !== s && e.fase === G.faseI) { e.estado = 'huye'; e.dest = { x: e.pos.x + rnd(-30, 30), z: e.pos.z + (e.pos.z < P.pos.z ? -150 : 150) }; e.fase = -1; n++; }
        G.jefeCaido = true; cartel('¡HA CAÍDO SU JEFE!'); aviso(n ? 'Sin jefe, los demás huyen' : 'El jefe de la partida ha caído', 3);
      }
      s.muerto = true; s.muertoT = 0; s.estado = 'muerto'; s.caida = Math.floor(Math.random() * 3); s.caidaLado = Math.random() < 0.5 ? 1 : -1;
      if (s.humano) { s.armL.rotation.set(rnd(-0.6, 1.2), 0, rnd(-1.4, -0.3)); s.armR.rotation.set(rnd(-0.6, 1.2), 0, rnd(0.3, 1.4)); s.codoL.rotation.set(rnd(0, 1), 0, 0); s.codoR.rotation.set(rnd(0, 1), 0, 0); } if (s.humano) { s.arma.position.set(0.35, 1.05, -0.25); s.arma.rotation.set(0, 0.9, 1.4); } if (!s.elev) setTimeout(() => G && s.g.parent && mancha(s.pos.x - Math.sin(s.yaw) * 0.5, s.pos.z - Math.cos(s.yaw) * 0.5, rnd(0.9, 1.5), true), 700);
      if (s.team === 'E') {
        G.bajas++; if (porJugador) { G.bajasJ++; if (cabeza) G.cabezas++;
          G.rachaN = G.t - (G.rachaT || -99) < 5 ? (G.rachaN || 0) + 1 : 1; G.rachaT = G.t;
          if (G.rachaN === 3) { cartel('¡RACHA!'); G.viva = Math.max(G.viva, 7); aviso('Tres seguidos: la escuadra se crece', 2.5); } }
        if (!s.elev && Math.random() < 0.65) soltarBotin(s.pos);
        if (Math.random() < 0.25 && gritoT <= 0) { gritoAliado(); gritoT = 4; }
      } else if (s.civil) { G.civiles = (G.civiles || 0) + 1; aviso(porJugador ? '¡Has matado a un civil! Mira antes de disparar' : 'Ha muerto un civil', 3.5); }
      else { voz(Math.random() < 0.5 ? 'herido' : 'sanitario', null, 0.8, panDe(s.pos)); aviso('Ha caído el legionario ' + s.nombre, 2.5); }
    } else { s.golpe = 0.4; if (s.team === 'E' && s.estado !== 'carga') { s.estado = 'cubierto'; s.agach = true; s.t = rnd(1.5, 3); s.alerta = true; } }
  }

  const _hit = new V3();
  function trazar(o, dir, maxD, equipo) {
    const dObs = World.obstaculo(o, dir, maxD);
    let mejor = null, mt = dObs, cabeza = false;
    for (const s of G.sold) {
      if (s.muerto || s.team === equipo) continue;
      const esf = s.agach ? [[1.27, 0.15, true], [0.95, 0.26], [0.65, 0.24], [0.3, 0.2]] : [[1.69, 0.15, true], [1.28, 0.26], [0.9, 0.24], [0.45, 0.2]];
      for (const e of esf) {
        const cx = s.pos.x - o.x, cy = s.pos.y + e[0] - o.y, cz = s.pos.z - o.z;
        const t = cx * dir.x + cy * dir.y + cz * dir.z; if (t < 0 || t > mt) continue;
        const px = cx - dir.x * t, py = cy - dir.y * t, pz = cz - dir.z * t;
        if (px * px + py * py + pz * pz < e[1] * e[1]) { mt = t; mejor = s; cabeza = !!e[2]; }
      }
    }
    return { s: mejor, t: mt, cabeza, obs: dObs };
  }
  function dirCamara(out, spread) { return out.set(rnd(-spread, spread), rnd(-spread, spread), -1).normalize().applyQuaternion(cam.quaternion); }

  function dispararJugador() {
    const a = ARMAS[P.arma];
    if (G.recT > 0 || G.cool > 0 || P.muerto) return;
    if (a.mun <= 0) { Snd.clic(); G.cool = 0.3; if (a.res > 0) recargar(); return; }
    a.mun--; G.cool = a.cad; G.tiros++;
    Snd.disparo(a.tipo); if (a.id === 'mauser') Snd.cerrojo();
    fogonazo.visible = true; fogonazo.material.rotation = Math.random() * 6; luzDisparo.intensity = 2.2; G.flashT = 0.05;
    P.retroceso += a.retro;
    const sp = (P.mira ? a.dispM : a.disp) * (P.mov > 0.2 ? 1.8 : 1) * (P.agach ? 0.7 : 1);
    cam.updateMatrixWorld(); dirCamara(_d, sp); cam.getWorldPosition(_o);
    const r = trazar(_o, _d, 260, 'L');
    _hit.copy(_o).addScaledVector(_d, r.t);
    if (r.s) { G.aciertos++; sangre(_hit, _d, r.cabeza); herir(r.s, a.dmg * (r.cabeza ? 2.5 : 1) * rnd(0.85, 1.1), P.pos, true, r.cabeza); }
    else if (r.t < 259) polvo(_hit, 2, 0.4);
    for (const s of G.sold) if (s.team === 'E' && !s.muerto && dist2D(s.pos, P.pos) < 130) s.alerta = true;
    if (a.mun === 0 && a.res > 0) setTimeout(() => G && !G.recT && ARMAS[P.arma] === a && a.mun === 0 && recargar(), 350);
  }
  function recargar() {
    if (G.nido) return recargaNido();
    const a = ARMAS[P.arma];
    if (G.recT > 0 || a.mun >= a.carg || a.res <= 0) return;
    G.recT = a.rec; Snd.recarga(); P.mira = false;
    if (Math.random() < 0.4) voz('recargando', null, 0.9);
  }
  function terminaRecarga() { const a = ARMAS[P.arma], n = Math.min(a.carg - a.mun, a.res); a.mun += n; a.res -= n; }
  function cambiarArma() {
    if (G.nido) { aviso('Estás a la ametralladora', 2); return; }
    if (ARMAS.length < 2) { aviso('Compra una segunda arma en la armería', 2); return; }
    if (G.recT > 0) return;
    P.arma = (P.arma + 1) % ARMAS.length; G.cool = 0.5; P.mira = false; G.cambioT = 0.4; construyeBrazos(modelos[P.arma].izq, Progreso.P.equipo.tat);
  }
  function lanzarGranada() {
    if (P.muerto) return;
    if (P.granadas <= 0) { aviso('No te quedan granadas: recoge las que dejan los caídos', 2.5); return; }
    P.granadas--; voz('granada', null, 1);
    cam.getWorldPosition(_o); dirCamara(_d, 0);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), World.mat(0x3d4a2c));
    m.position.copy(_o).addScaledVector(_d, 0.5); scene.add(m);
    G.proy.push({ tipo: 'granada', m, v: _d.clone().multiplyScalar(17).add(new V3(0, 4.5, 0)), t: 3.2, jug: true });
  }
  function derrumbes(caidos) { // edificios y blancos que se vienen abajo
    for (const c of caidos) {
      const q = new V3(c.x, c.y, c.z);
      for (let i = 0; i < 12; i++) particula(q.clone().add(new V3(rnd(-c.r, c.r), rnd(0, c.alto * 0.7), rnd(-c.r, c.r))), i % 3 ? 0xb39a78 : 0x5a4c3c, rnd(3, 6.5), rnd(2.5, 5), 2.2, rnd(0.6, 2.4));
      for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(geoGota, World.mat(0x8f7350)); m.scale.set(rnd(8, 22), rnd(6, 14), rnd(8, 22)); m.position.copy(q).add(new V3(rnd(-c.r, c.r) * 0.6, rnd(0.5, c.alto * 0.6), rnd(-c.r, c.r) * 0.6)); scene.add(m); gotas.push({ m, v: new V3(rnd(-7, 7), rnd(3, 12), rnd(-7, 7)), seco: true }); }
      if (c.blanco) { explosionFx(q); fuegos.push({ p: q.clone(), t: 12, n: 0 }); }
      G.temblor = Math.max(G.temblor, 0.6); Snd.explosion(dist2D(q, P.pos) * 0.5, panDe(q)); aviso(c.blanco ? '¡Blanco destruido!' : '¡Edificio derribado!', 2);
      if (G_casas) for (const k of G_casas) if (!k.hecho && Math.hypot(k.x - c.x, k.z - c.z) < 1.5) registrarCasa(k, true);
    }
  }
  function explotar(p, radio, letal, jug) {
    explosionFx(p); if (radio >= 12) explosionGrande(p);
    if (radio >= 10) derrumbes(World.danar(p, radio >= 12 ? 2 : 1, radio));
    const d = dist2D(p, P.pos); Snd.explosion(d, panDe(p)); G.temblor = Math.max(G.temblor, clamp(1.2 - d / 40, 0, 1));
    for (const s of G.sold) {
      if (s.muerto) continue; const ds = s.pos.distanceTo(p);
      if (ds < radio) herir(s, ds < letal ? 999 : 80 * (1 - ds / radio), p, jug);
      else if (s.team === 'E' && ds < radio * 3) { s.alerta = true; s.estado = 'cubierto'; s.agach = true; s.t = rnd(2, 4); }
    }
    if (d < radio) herir(P, Math.round((d < letal ? 85 : 55) * (1 - d / radio) + 10), p);
  }
  // botín: cananas que dejan los caídos; se recogen pasando por encima
  const geoBotin = new THREE.BoxGeometry(0.34, 0.14, 0.2), matBotin = World.mat(0x6b4a2a), matBotin2 = World.mat(0xb8913a);
  function soltarBotin(pos) {
    const g = new THREE.Group(), x = pos.x + rnd(-0.9, 0.9), z = pos.z + rnd(-0.9, 0.9);
    const c = new THREE.Mesh(geoBotin, matBotin); c.castShadow = true; g.add(c); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 5), matBotin2); b.position.set(-0.12 + i * 0.08, 0.1, 0); g.add(b); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.fogon, color: lin(0xffd060), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(0.9); sp.position.y = 0.25; g.add(sp);
    g.position.set(x, H(x, z) + 0.1, z); g.rotation.y = Math.random() * 6; scene.add(g);
    (G.botin = G.botin || []).push({ g, sp, t: 75 }); if (G.botin.length > 14) scene.remove(G.botin.shift().g);
  }
  function actualizaBotin(dt) {
    if (!G.botin) return; const aPie = !G.carro && !G.nido && !G.vuelo && !P.muerto && !(G.salto && G.salto.fase !== 'suelo');
    for (let i = G.botin.length - 1; i >= 0; i--) {
      const b = G.botin[i]; b.t -= dt; b.sp.material.opacity = 0.4 + Math.sin(G.t * 5 + i) * 0.2;
      const coge = aPie && Math.hypot(b.g.position.x - P.pos.x, b.g.position.z - P.pos.z) < 1.8;
      if (coge) {
        let txt = '+ munición'; ARMAS.forEach(a => { a.res += a.carg; });
        const r = Math.random(); if (r < 0.14) { P.granadas++; txt += ' y una granada'; } else if (r < 0.24) { P.curas++; txt += ' y una venda'; }
        aviso(txt, 1.8); Snd.clic();
      }
      if (coge || b.t <= 0) { scene.remove(b.g); G.botin.splice(i, 1); }
    }
  }
  // arma blanca: golpe al enemigo que esté a un paso y delante
  function enemigoAMano() {
    const alc = (Progreso.P.extras || {}).cuchillo ? 3.2 : 2.6; let mejor = null, md = alc;
    for (const s of G.sold) {
      if (s.team !== 'E' || s.muerto) continue; const d = dist2D(s.pos, P.pos); if (d > md || Math.abs(s.pos.y - P.pos.y) > 1.6) continue;
      let a = Math.atan2(-(s.pos.x - P.pos.x), -(s.pos.z - P.pos.z)) - P.yaw; while (a > Math.PI) a -= 6.283; while (a < -Math.PI) a += 6.283;
      if (Math.abs(a) < 1.0) { md = d; mejor = s; }
    }
    return mejor;
  }
  function acuchillar() {
    if (P.muerto || G.carro || G.nido || G.vuelo || (G.salto && G.salto.fase !== 'suelo') || G.cuchT > 0) return;
    G.cuchT = (Progreso.P.extras || {}).cuchillo ? 0.55 : 0.9; G.estocada = 0.28; Snd.silbido(0);
    const s = enemigoAMano(); if (!s) return;
    const p = new V3(s.pos.x, s.pos.y + (s.agach ? 0.9 : 1.3), s.pos.z);
    sangre(p, _d.set(-Math.sin(P.yaw), 0.2, -Math.cos(P.yaw)), true); Snd.impacto(); G.temblor = Math.max(G.temblor, 0.25);
    herir(s, 999, P.pos, true); G.aciertos++; G.tiros++;
    if (Math.random() < 0.5) voz('a_mi', '¡A MÍ LA LEGIÓN!', 0.9);
  }
  function curar() {
    if (P.muerto) return;
    if (P.curas <= 0) { aviso('No te quedan vendas: recoge las que dejan los caídos', 2.5); return; }
    if (P.vida >= 100) { aviso('No estás herido', 1.5); return; }
    P.curas--; P.vida = Math.min(100, P.vida + 50); $('dano').style.opacity = 0; aviso('Te vendas la herida: salud ' + Math.ceil(P.vida), 2.5);
  }
  function pedirAvion() {
    if (P.avion <= 0 || !G.fase || G.fase.tipo === 'reach') { aviso(P.avion <= 0 ? 'No queda apoyo aéreo' : 'Sin objetivo para la aviación', 2); return; }
    if (G.vuelo || (G.salto && G.salto.fase !== 'suelo')) return;
    P.avion--;
    // el jugador pilota la pasada del Heinkel: entra por detrás de la sección, rumbo a la posición
    const f = G.fase, av = World.avion(), dx = f.x - P.pos.x, dz = f.z - P.pos.z, d = Math.hypot(dx, dz) || 1;
    const pos = new V3(P.pos.x - dx / d * 330, 0, P.pos.z - dz / d * 330); pos.y = Math.max(H(f.x, f.z), H(P.pos.x, P.pos.z)) + 75;
    av.position.copy(pos); scene.add(av);
    const mira = new THREE.Mesh(new THREE.RingGeometry(8, 10.5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.9, depthTest: false, fog: false })); mira.renderOrder = 9; scene.add(mira); { const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 46, 6), mira.material); haz.position.y = 23; haz.renderOrder = 9; mira.add(haz); }
    G.vuelo = { m: av, pos, rumbo: Math.atan2(-dx, -dz), rumbo0: Math.atan2(-dx, -dz), yaw0: P.yaw, pitch0: P.pitch, bombas: 4, t: 0, mgT: 0, n: 0, mira, alabeo: 0, finT: 0 };
    P.yaw = G.vuelo.rumbo; P.pitch = 0; P.mira = false; disparando = false; G.pedido = 0;
    $('bFuego').textContent = 'BOMBA'; $('fuego2').textContent = 'AMETR.';
    Snd.avion(); voz('aviacion', '¡AVIACIÓN!', 1);
    aviso('Pilotas el Heinkel: la cruz del centro marca dónde caerá la bomba. Gira arrastrando y pulsa BOMBA', 6);
  }
  const _imp = new V3();
  function impactoBomba(V, out) { // dónde caería una bomba soltada ahora
    const h = V.pos.y - H(V.pos.x, V.pos.z), t = (-2 + Math.sqrt(4 + 2 * 9.8 * Math.max(1, h))) / 9.8;
    out.set(V.pos.x - Math.sin(V.rumbo) * 56 * t, 0, V.pos.z - Math.cos(V.rumbo) * 56 * t); out.y = H(out.x, out.z) + 0.4; return out;
  }
  function finVuelo() {
    const V = G.vuelo; if (!V) return; G.vuelo = null;
    scene.remove(V.mira); G.avion = { m: V.m, libre: new V3(-Math.sin(V.rumbo) * 62, 4, -Math.cos(V.rumbo) * 62), t: 8 };
    P.yaw = V.yaw0; P.pitch = V.pitch0; disparando = false; G.mgCarro = false; G.pedido = 0;
    $('bFuego').textContent = G.carro ? 'CAÑÓN' : 'FUEGO'; $('fuego2').textContent = G.carro ? 'AMETR.' : 'FUEGO';
    aviso('El Heinkel se retira. ¡Adelante!', 2.5);
  }
  function actualizaVuelo(dt) {
    const V = G.vuelo; const mirando = (V.sigue && G.proy.includes(V.sigue)) || V.impT > 0; if (!mirando) V.t += dt;
    let dy = P.yaw - V.rumbo; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
    const giro = clamp(dy, -0.55 * dt, 0.55 * dt); V.rumbo += giro; P.yaw = V.rumbo + clamp(dy - giro, -0.5, 0.5);
    V.alabeo += (clamp(dy * 1.6, -0.6, 0.6) - V.alabeo) * Math.min(1, dt * 3);
    V.pos.x -= Math.sin(V.rumbo) * 62 * dt; V.pos.z -= Math.cos(V.rumbo) * 62 * dt;
    const suelo = H(V.pos.x, V.pos.z); V.pos.y += (Math.max(V.pos.y, suelo + 55) - V.pos.y) * Math.min(1, dt * 2);
    V.m.position.copy(V.pos); V.m.rotation.set(0, V.rumbo, V.alabeo, 'YXZ'); (V.m.userData.helices || []).forEach(h => h.rotation.z += dt * 38);
    V.son = (V.son || 7.5) - dt; if (V.son <= 0) { V.son = 7.5; Snd.avion(); }
    impactoBomba(V, _imp); V.mira.position.copy(_imp); V.mira.material.opacity = 0.6 + Math.sin(G.t * 10) * 0.3;
    if (G.pedido > 0) {
      G.pedido = 0;
      if (V.bombas > 0) {
        V.bombas--; G.tiros++;
        const b = World.bomba(); b.scale.setScalar(2.6); b.position.copy(V.pos).add(new V3(0, -1.6, 0)); scene.add(b);
        G.proy.push({ tipo: 'bomba', m: b, v: new V3(-Math.sin(V.rumbo) * 56, -3, -Math.cos(V.rumbo) * 56), t: 12, jug: true, estela: 0 });
        Snd.clic(); Snd.caida(3.6); aviso('¡Bomba fuera!', 1.5); V.sigue = G.proy[G.proy.length - 1]; V.finT = 0;
      }
    }
    V.mgT -= dt;
    if ((G.mgCarro || teclas.Space) && V.mgT <= 0) { // ametralladora de morro: barre el suelo por delante del círculo
      V.mgT = 0.075; V.n++;
      const p = new V3(_imp.x - Math.sin(V.rumbo) * 30 + rnd(-4, 4), 0, _imp.z - Math.cos(V.rumbo) * 30 + rnd(-4, 4)); p.y = H(p.x, p.z) + 0.2;
      Snd.disparo('mg', 0, 0); polvo(p, 1, 0.7); if (V.n % 2 === 0) trazadora(V.pos.clone().add(new V3(0, -0.8, 0)), p);
      for (const s of G.sold) if (s.team === 'E' && !s.muerto && s.pos.distanceTo(p) < 2.6) { sangre(new V3(s.pos.x, s.pos.y + 1, s.pos.z), null, true); herir(s, 90, P.pos, true); }
    }
    for (const s of G.sold) if (s.team === 'E' && !s.muerto && dist2D(s.pos, V.pos) < 160) s.alerta = true;
    if (V.finT > 0) { V.finT -= dt; if (V.finT <= 0) return finVuelo(); }
    if (!mirando && !V.vista && (V.t > 20 || Math.hypot(V.pos.x, V.pos.z) > 760)) { if (V.bombas > 0 && (V.pasadas || 0) < 3) { V.pasadas = (V.pasadas || 0) + 1; V.vista = true; } else finVuelo(); }
  }

  // ---------- IA común ----------
  function apuntarHacia(s, p, dt, vel) {
    const obj = Math.atan2(-(p.x - s.pos.x), -(p.z - s.pos.z));
    let d = obj - s.yaw; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283;
    s.yaw += clamp(d, -vel * dt, vel * dt);
  }
  function moverHacia(s, dest, vel, dt) {
    const dx = dest.x - s.pos.x, dz = dest.z - s.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.6) { s.mueve = false; return true; }
    const px = s.pos.x, pz = s.pos.z;
    s.pos.x += dx / d * vel * dt; s.pos.z += dz / d * vel * dt; World.colisiona(s.pos, 0.35);
    if (Math.hypot(s.pos.x - px, s.pos.z - pz) < vel * dt * 0.3) { s.pos.x += -dz / d * vel * dt * (s.rodeo || 1); s.pos.z += dx / d * vel * dt * (s.rodeo || 1); World.colisiona(s.pos, 0.35); }
    s.mueve = true; s.velAnim = vel;
    apuntarHacia(s, dest, dt, 6);
    return false;
  }
  function elegirObjetivo(s) {
    if (s.team === 'E') {
      const cands = [];
      if (!P.muerto && dist2D(s.pos, P.pos) < 170) cands.push(P);
      for (const a of G.sold) if (a.team === 'L' && !a.muerto && !(a.herido > 0) && dist2D(s.pos, a.pos) < 160) cands.push(a);
      cands.sort((a, b) => (dist2D(s.pos, a.pos) - (a === P ? 20 : 0)) - (dist2D(s.pos, b.pos) - (b === P ? 20 : 0)));
      for (let i = 0; i < Math.min(3, cands.length); i++) if (puedeVer(s, cands[i])) return cands[i];
      return null;
    }
    const cand = G.sold.filter(e => e.team === 'E' && !e.muerto && dist2D(s.pos, e.pos) < 150 && (e.alerta || dist2D(s.pos, e.pos) < 60)).sort((a, b) => dist2D(s.pos, a.pos) - dist2D(s.pos, b.pos));
    for (let i = 0; i < Math.min(3, cand.length); i++) if (puedeVer(s, cand[i])) return cand[i];
    return null;
  }
  function disparaIA(s, dt) {
    s.tirT -= dt; if (s.apunta > 0) { s.apunta -= dt; return; }
    if (s.tirT > 0 || !s.obj || s.obj.muerto) return;
    const fao = s.tipoArma === 'fao';
    if (fao) { if (s.rafaga <= 0) s.rafaga = 4; s.rafaga--; s.tirT = s.rafaga > 0 ? 0.12 : rnd(1.8, 2.8); }
    else s.tirT = s.cad * rnd(0.8, 1.25);
    const t = s.obj, d = dist2D(s.pos, t.pos), mz = boca(s), dj = dist2D(s.pos, P.pos);
    s.ultimoTiro = G.t;
    particula(mz, 0xffffff, 0.55, 0.07, 0.5, 0, true);
    if (s.team === 'E') Snd.disparo('enemigo', dj, panDe(s.pos)); else Snd.disparo(fao ? 'z45' : 'enemigo', Math.max(dj, 8), panDe(s.pos));
    let p;
    if (s.team === 'E') { p = (0.3 * Math.exp(-d / 55) + 0.03) * AJ.dif * (G.difX || 1); if (G.viva > 0) p *= 0.6; if (t.agach) p *= 0.55; if (t === P && P.mov > 0.3) p *= 0.75; if (t === P && G.salto && G.salto.fase !== 'suelo') p = G.salto.fase === 'campana' ? p * 0.3 : 0; if (t === P && G.nido) p *= 0.7; if (s.tirador) p = Math.min(0.3, p * 3.2); if (t === P && G.caza) p = (0.3 * Math.exp(-s.pos.distanceTo(G.caza.pos) / 70) + 0.015) * AJ.dif * (s.aa ? 1.5 : 0.6); }
    else { p = (0.26 * Math.exp(-d / 60) + 0.05) * (G.viva > 0 ? 1.7 : 1); if (t.agach) p *= 0.6; if (fao) p *= 0.55; }
    const acierta = Math.random() < p;
    const dest = new V3(t.pos.x, t.pos.y + (t.agach ? 1 : 1.35), t.pos.z);
    if (!acierta) dest.add(new V3(rnd(-1.8, 1.8), rnd(-0.6, 1.2), rnd(-1.8, 1.8)));
    if (fao || Math.random() < 0.45 || (t === P && G.caza)) trazadora(mz, dest);
    if (t === P && G.caza && s.pos.distanceTo(G.caza.pos) < 320 && Math.random() < 0.6) particula(G.caza.pos.clone().add(new V3(rnd(-12, 12), rnd(-6, 6), rnd(-12, 12))), 0x1c1c1c, rnd(2, 3.5), rnd(0.9, 1.6), 1.6, 0.4); // nubecillas del fuego antiaéreo
    if (acierta) { herir(t, t === P ? Math.round(rnd(16, 28) * AJ.dif) : (s.team === 'L' ? rnd(45, 90) : rnd(30, 60)), s.pos, false, false); if (t !== P) sangre(dest, _d.copy(dest).sub(mz).normalize()); }
    else if (t === P) {
      if (Math.random() < 0.5) Snd.silbido(panDe(s.pos));
      if (Math.random() < 0.6) polvo(new V3(P.pos.x + rnd(-2.5, 2.5), H(P.pos.x, P.pos.z) + rnd(0, 0.6), P.pos.z + rnd(-2.5, 2.5)), 1);
    } else polvo(new V3(dest.x, H(dest.x, dest.z) + 0.1, dest.z), 1, 0.35);
    if (t.team === 'E') t.alerta = true;
  }

  const _S = new V3(), _T = new V3(), _D = new V3(), _E = new V3(), _pl = new V3(), _u = new V3(), _v = new V3(), _a1 = new V3(), _qp = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  function ikBrazo(brazo, obj, polo) {
    const ante = brazo.children[0], mano = ante.children[0], L1 = ante.position.length(), L2 = mano.position.length();
    brazo.parent.getWorldQuaternion(_qp); brazo.getWorldPosition(_S);
    _D.copy(obj).sub(_S); const d = _D.length() || 1, dm = Math.min(d, L1 + L2 - 0.004); _D.divideScalar(d);
    const ca = clamp((L1 * L1 + dm * dm - L2 * L2) / (2 * L1 * dm), -1, 1), sa = Math.sqrt(1 - ca * ca);
    _pl.copy(polo).addScaledVector(_D, -polo.dot(_D)).normalize();
    _u.copy(_D).multiplyScalar(ca).addScaledVector(_pl, sa);
    _E.copy(_S).addScaledVector(_u, L1);
    _qp.invert();
    brazo.quaternion.setFromUnitVectors(_a1.copy(ante.position).normalize(), _v.copy(_u).applyQuaternion(_qp));
    _v.copy(_S).addScaledVector(_D, dm).sub(_E).normalize();
    _q2.copy(brazo.quaternion).invert().multiply(_qp);
    ante.quaternion.setFromUnitVectors(_a1.copy(mano.position).normalize(), _v.applyQuaternion(_q2));
  }
  const _gD = new V3(), _gI = new V3(), _polo = new V3();
  function manosAlFusil(s) {
    s.g.updateMatrixWorld(true);
    _gD.set(0.02, -0.075, 0.3).applyMatrix4(s.arma.matrixWorld); _gI.set(-0.015, -0.055, 0.02).applyMatrix4(s.arma.matrixWorld);
    const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
    ikBrazo(s.armR, _gD, _polo.set(cy * 0.55, -1, -sy * 0.55));
    ikBrazo(s.armL, _gI, _polo.set(-cy * 0.35, -1, sy * 0.35));
  }
  // postura articulada: correr, rodilla en tierra, apuntar
  function pose(s, dt) {
    const k = Math.min(1, dt * 10), L = (o, ax, v) => { o.rotation[ax] += (v - o.rotation[ax]) * k; };
    let bajada = 0;
    if (s.mueve) {
      s.anim += dt * (s.velAnim || 3) * 2.3; const a = Math.sin(s.anim);
      L(s.legL, 'x', a * 0.85); L(s.legR, 'x', -a * 0.85);
      L(s.rodL, 'x', -Math.max(0, Math.cos(s.anim)) * 1.2 - 0.1); L(s.rodR, 'x', -Math.max(0, -Math.cos(s.anim)) * 1.2 - 0.1);
      L(s.torso, 'x', s.agach ? -0.45 : -0.18);
      bajada = s.agach ? 0.2 : Math.abs(Math.cos(s.anim)) * 0.04;
    } else if (s.agach) {
      L(s.legL, 'x', 1.45); L(s.rodL, 'x', -1.45); L(s.legR, 'x', 0.15); L(s.rodR, 'x', -1.6); L(s.torso, 'x', -0.08);
      bajada = 0.42;
    } else { L(s.legL, 'x', 0); L(s.legR, 'x', 0); L(s.rodL, 'x', 0); L(s.rodR, 'x', 0); L(s.torso, 'x', 0); }
    if (s.civil) { s.armL.rotation.set(2.75, 0, 0.3); s.armR.rotation.set(2.75, 0, -0.3); s.codoL.rotation.set(0.35, 0, 0); s.codoR.rotation.set(0.35, 0, 0); return bajada; }
    if (s.golpe > 0) { s.golpe -= dt; s.torso.rotation.x = 0.5 * Math.min(1, s.golpe / 0.3); }
    const apunta = s.obj && !s.mueve && !(s.golpe > 0);
    if (s.humano) {
      // el fusil se encara o se lleva terciado, y las manos lo siguen
      const P3 = s.arma.position, ty = (apunta ? 1.435 : s.mueve ? 1.14 : 1.1) - (s.agach && !s.mueve ? 0.0 : 0) + (s.mueve ? Math.sin(s.anim * 2) * 0.015 : 0);
      P3.x += ((apunta ? 0.165 : 0.04) - P3.x) * k; P3.y += (ty - P3.y) * k; P3.z += ((apunta ? -0.43 : -0.2) - P3.z) * k;
      L(s.arma, 'x', apunta ? 0 : 0.6); L(s.arma, 'y', apunta ? 0 : 0.75); L(s.arma, 'z', 0);
      L(s.cabeza, 'x', apunta ? 0.1 : 0); L(s.cabeza, 'z', apunta ? -0.22 : 0);
      if (!s.lejos) manosAlFusil(s);
      return bajada;
    }
    L(s.armR, 'x', apunta ? 1.25 : 0.55); L(s.codoR, 'x', apunta ? 0.55 : 0.9);
    L(s.armL, 'x', apunta ? 1.45 : 0.9); L(s.armL, 'z', apunta ? 0.5 : 0.35); L(s.armR, 'z', apunta ? -0.1 : -0.2); L(s.codoL, 'x', apunta ? 0.3 : 0.8);
    L(s.cabeza, 'x', apunta ? 0.12 : 0);
    s.arma.position.set(0.06, (apunta ? 1.47 : 1.2) - bajada * 0.9, apunta ? -0.3 : -0.22);
    L(s.arma, 'x', apunta ? 0 : 0.7); L(s.arma, 'z', apunta ? 0 : 0.35);
    return bajada;
  }

  function actualizaSoldado(s, dt) {
    if (s.herido > 0) { // tendido, esperando al que lo vende
      s.herido -= dt; s.g.rotation.x += (1.45 - s.g.rotation.x) * Math.min(1, dt * 5); s.g.position.set(s.pos.x, s.pos.y + 0.14, s.pos.z);
      const aPie = !G.carro && !G.nido && !G.vuelo && !P.muerto;
      if (aPie && dist2D(s.pos, P.pos) < 2.4) { s.venda += dt; if (s.venda > 1.6) { s.herido = 0; s.vida = 60; s.g.rotation.x = 0; G.rescates = (G.rescates || 0) + 1; aviso('Has salvado a ' + s.nombre, 2.5); voz('viva_legion_b', '¡VIVA LA LEGIÓN!', 0.9, panDe(s.pos)); } }
      else s.venda = Math.max(0, s.venda - dt);
      if (s.herido <= 0 && s.vida < 60) { s.herido = 0; s.g.rotation.x = 0; herir(s, 999, s.pos); }
      return;
    }
    if (s.aire) {
      const A = s.aire; s.pos.x += A.vx * dt; s.pos.z += A.vz * dt; s.pos.y += A.vy * dt;
      const h = H(s.pos.x, s.pos.z);
      if (s.pos.y <= h) { s.pos.y = h; s.g.remove(A.campana); s.aire = null; polvo(s.pos, 3, 0.6); }
      s.legL.rotation.x = 0.25; s.legR.rotation.x = 0.1; s.rodL.rotation.x = -0.3; s.rodR.rotation.x = -0.2; s.armL.rotation.x = 2.6; s.armR.rotation.x = 2.6; s.armL.rotation.z = 0.3; s.armR.rotation.z = -0.3;
      s.g.position.copy(s.pos); s.g.rotation.y = s.yaw; return;
    }
    if (s.muerto) { if (s.muertoT < 1) { s.muertoT += dt * 1.7; const k = Math.min(1, s.muertoT), e = k * k * (1 + 0.12 * Math.sin(k * 9.4) * (1 - k)); if (s.caida === 2) { s.g.rotation.z = s.caidaLado * e * 1.5; s.g.rotation.x = e * 0.2; } else s.g.rotation.x = (s.caida ? -1 : 1) * e * 1.5; s.legL.rotation.x = e * 0.7 * (s.caida === 1 ? -0.3 : 1); s.rodL.rotation.x = -e * 1.1; s.rodR.rotation.x = -e * 0.4; s.cabeza.rotation.x = e * 0.4; s.g.position.y = s.pos.y + (s.caida === 2 ? 0.2 : 0.12) * k; } else if ((s.muertoT += dt) > 30 && s.g.parent) scene.remove(s.g); return; }
    s.visT -= dt;
    if (s.visT <= 0 && s.civil) s.visT = 9;
    if (s.visT <= 0) { s.visT = rnd(0.45, 0.85); s.obj = elegirObjetivo(s); if (s.obj && s.team === 'E' && !s.alerta) { s.alerta = true; s.apunta = rnd(0.6, 1.2); } }
    s.mueve = false;
    if (s.civil) { if (!s.llego) { s.agach = false; if (moverHacia(s, s.dest, 3.4, dt)) s.llego = true; } else s.agach = true; }
    else if (s.team === 'E') iaEnemigo(s, dt); else iaAliado(s, dt);
    s.pos.y = H(s.pos.x, s.pos.z) + (s.elev || 0);
    s.lejos = dist2D(s.pos, P.pos) > 110;
    const baj = pose(s, dt);
    s.g.position.set(s.pos.x, s.pos.y - baj, s.pos.z); s.g.rotation.y = s.yaw;
    if (s.mueve && dist2D(s.pos, P.pos) < 45) { s.polvoT -= dt; if (s.polvoT <= 0) { s.polvoT = 0.32; particula(new V3(s.pos.x, s.pos.y + 0.1, s.pos.z), 0xc9a982, 0.35, 0.7, 1.5, 0.3); } }
  }

  function iaEnemigo(s, dt) {
    s.t -= dt;
    switch (s.estado) {
      case 'idle': s.agach = false; if (s.alerta) { s.estado = 'cubierto'; s.t = rnd(0.3, 1.2); } else if (s.t <= 0) { s.yaw = s.spotYaw + rnd(-0.6, 0.6); s.t = rnd(2, 5); } break;
      case 'cubierto': s.agach = true;
        if (s.t <= 0 && s.alerta && G.fase && G.fase.tipo === 'take' && s.fase === G.faseI && G.fase._spots && Math.random() < (s.vida < 60 ? 0.3 : 0.1)) {
          // se repliega a otro parapeto para no tirar siempre desde el mismo sitio
          const sp = G.fase._spots[Math.floor(Math.random() * G.fase._spots.length)];
          if (Math.hypot(sp.x - P.pos.x, sp.z - P.pos.z) > 16 && Math.hypot(sp.x - s.pos.x, sp.z - s.pos.z) > 4) { s.dest = { x: sp.x + rnd(-1, 1), z: sp.z + rnd(-1, 1) }; s.estado = 'avanza'; s.vel = 3.8; s.t = rnd(5, 8); s.spotYaw = sp.yaw; break; }
        }
        if (s.t <= 0 && s.alerta) { s.estado = 'asomado'; s.t = rnd(1.6, 3.4) * (0.7 + 0.3 * AJ.dif); s.apunta = rnd(0.35, 0.8) / AJ.dif; } break;
      case 'asomado':
        s.agach = s.muro ? false : s.agach;
        if (s.obj) { apuntarHacia(s, s.obj.pos, dt, 4); disparaIA(s, dt); }
        if (s.t <= 0) { s.estado = 'cubierto'; s.t = rnd(1.2, 3.2) / AJ.dif; }
        break;
      case 'avanza':
        s.agach = false;
        if (moverHacia(s, s.dest, s.vel || 3.2, dt)) { s.estado = 'asomado'; s.muro = false; s.agach = true; s.t = rnd(2, 4); }
        else if (s.t <= 0) { s.estado = 'para'; s.t = rnd(2, 3.5); s.apunta = rnd(0.4, 0.8); }
        break;
      case 'para': s.agach = true; if (s.obj) { apuntarHacia(s, s.obj.pos, dt, 4); disparaIA(s, dt); } if (s.t <= 0) { s.estado = 'avanza'; s.t = rnd(3, 6); } break;
      case 'carga': { // corre hacia el legionario más cercano y lo ataca cuerpo a cuerpo
        s.agach = false; s.t -= dt;
        if (!s.presa || s.presa.muerto || s.t <= 0) { s.t = 1.2; let md = dist2D(s.pos, P.pos); s.presa = P; for (const a of G.sold) if (a.team === 'L' && !a.muerto && !(a.herido > 0)) { const d = dist2D(s.pos, a.pos); if (d < md - 4) { md = d; s.presa = a; } } }
        const d = dist2D(s.pos, s.presa.pos);
        if (d > 2.1) moverHacia(s, s.presa.pos, s.vel || 4.6, dt);
        else { apuntarHacia(s, s.presa.pos, dt, 8); s.golpeT -= dt; if (s.golpeT <= 0) { s.golpeT = 1.15; herir(s.presa, s.presa === P ? Math.round(17 * AJ.dif) : 45, s.pos); if (s.presa === P) { G.temblor = Math.max(G.temblor, 0.35); } } }
        break;
      }
      case 'huye': s.agach = false; if (moverHacia(s, s.dest, 4.5, dt)) { s.muerto = true; scene.remove(s.g); } break;
    }
  }

  // ---------- IA de la escuadra: avance por saltos de cobertura ----------
  const huecos = [[-3, 3], [3, 3.5], [-6, 6], [6, 6.5], [-1.5, 8.5], [9, 9], [-9, 9.5], [1.5, 11]];
  function puntoCobertura(x, z, ex, ez) {
    const c = World.coberturaCerca(x, z, 6);
    if (!c) return { x, z };
    const dx = c.x - ex, dz = c.z - ez, d = Math.hypot(dx, dz) || 1;
    return { x: c.x + dx / d * (c.r + 0.55), z: c.z + dz / d * (c.r + 0.55) };
  }
  function enemigosVivos() { return G.sold.filter(e => e.team === 'E' && !e.muerto && e.fase === G.faseI); }
  function iaAliado(s, dt) {
    if (s.muralla) { tiroteoCubierto(s, dt, { x: s.pos.x, z: s.pos.z - 60 }); return; }
    const f = G.fase, enem = f ? enemigosVivos() : [];
    let modo = 'formacion';
    if (f && f.tipo === 'take' && enem.length) modo = 'asalto';
    else if (f && f.tipo === 'ambush' && G.disparada && enem.length) modo = 'asalto';
    else if (f && f.tipo === 'hold' && Math.hypot(P.pos.x - f.x, P.pos.z - f.z) < 60) modo = 'defensa';
    if (G.orden === 'cubrir' && modo !== 'defensa') { s.modo = 'cubrir'; s.cp = null; tiroteoCubierto(s, dt, f ? { x: f.x, z: f.z } : { x: s.pos.x, z: s.pos.z - 50 }); return; }
    if (modo !== s.modo) { s.modo = modo; s.cp = null; s.salto = 'cubre'; s.t = rnd(0.2, 2) + (s.hueco % 2) * 2.5; }

    if (modo === 'formacion') {
      const hx = huecos[s.hueco % huecos.length], sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const dx = P.pos.x + hx[0] * cy + hx[1] * sy, dz = P.pos.z - hx[0] * sy + hx[1] * cy, d = Math.hypot(dx - s.pos.x, dz - s.pos.z);
      if (d > (s.obj ? 9 : 2.5)) { moverHacia(s, { x: dx, z: dz }, 4.6 * (d > 20 ? 1.3 : 1), dt); s.agach = false; } else s.agach = !!s.obj;
      if (s.obj) { if (!s.mueve) apuntarHacia(s, s.obj.pos, dt, 5); disparaIA(s, dt); }
      else if (!s.mueve) s.yaw += (P.yaw - s.yaw) * Math.min(1, dt * 2);
      return;
    }
    if (modo === 'defensa') {
      if (!s.cp) s.cp = { x: f.x + ((s.hueco % 7) - 3) * 3.1 + (s.hueco >= 7 ? 1.5 : 0), z: f.z - 3.6 };
      if (!s.enSitio) { if (moverHacia(s, s.cp, 4.6, dt)) s.enSitio = true; else { s.agach = false; return; } }
      tiroteoCubierto(s, dt, { x: f.x, z: f.z - 60 });
      return;
    }
    s.enSitio = false;
    let ox = f.x, oz = f.z;
    if (f.tipo === 'ambush') { ox = enem.reduce((a, e) => a + e.pos.x, 0) / enem.length; oz = enem.reduce((a, e) => a + e.pos.z, 0) / enem.length; }
    const final = G.asalto || G.orden === 'asalto' || enem.length <= 2 || (G.viva > 0 && enem.length <= 4);
    if (s.salto === 'cubre') {
      tiroteoCubierto(s, dt, { x: ox, z: oz });
      s.t -= dt * (G.viva > 0 ? 1.8 : 1);
      if (s.t <= 0) {
        const d = Math.hypot(s.pos.x - ox, s.pos.z - oz), dJ = Math.hypot(P.pos.x - ox, P.pos.z - oz);
        const d2 = final ? 0 : Math.max(f.tipo === 'ambush' ? 12 : 15, d - rnd(10, 15));
        if (!final && d2 < dJ - 32) { s.t = rnd(2, 3); return; } // no se adelanta demasiado al jugador
        const ax = (s.pos.x - ox) / (d || 1), az = (s.pos.z - oz) / (d || 1), px = -az, pz = ax, lat = ((s.hueco % 7) - 3) * (final ? 1.8 : 4.5);
        const x = ox + ax * d2 + px * lat, z = oz + az * d2 + pz * lat;
        s.cp = final ? { x, z } : puntoCobertura(x, z, ox, oz);
        s.salto = 'salta'; s.rodeo = Math.random() < 0.5 ? 1 : -1; s.t = 0;
        if (Math.random() < 0.3 && gritoT <= 0) { voz(final ? 'a_mi_b' : Math.random() < 0.5 ? 'cubridme' : 'fuego', final ? '¡A MÍ LA LEGIÓN!' : null, 0.75, panDe(s.pos)); gritoT = 3; }
      }
    } else {
      s.agach = false; s.t -= dt;
      if (moverHacia(s, s.cp, final ? 4.9 : 4.4, dt) || s.t < -9) { s.salto = 'cubre'; s.t = final ? rnd(1, 2) : rnd(4.5, 8); s.ciclo = 0; }
    }
  }
  // agachado tras la cobertura, se asoma a disparar y vuelve a cubrirse
  function tiroteoCubierto(s, dt, mira) {
    s.ciclo += dt;
    s.agach = (s.ciclo % 4.6) > 2.6;
    if (s.obj && !s.agach) { apuntarHacia(s, s.obj.pos, dt, 5); disparaIA(s, dt); }
    else apuntarHacia(s, mira, dt, 3);
  }

  // ---------- misiones y fases ----------
  // casa a casa: cada casa del aduar hay que registrarla; dentro puede haber insurgentes, civiles o nadie
  let G_casas = null;
  function prepararCasas(f) {
    G_casas = null; if (!f._casas || !f._casas.length) return;
    const n = f._casas.length, tipos = ['ins', 'civ']; while (tipos.length < n) tipos.push(Math.random() < 0.45 ? 'ins' : Math.random() < 0.6 ? 'civ' : 'vacia');
    tipos.sort(() => Math.random() - 0.5);
    G_casas = f._casas.map((c, i) => {
      const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.marca, color: 0xffffff, depthTest: false, transparent: true, sizeAttenuation: false, fog: false })); mk.scale.set(0.026, 0.026, 1); mk.renderOrder = 9; mk.position.set(c.px, H(c.px, c.pz) + 3.4, c.pz); scene.add(mk);
      return Object.assign({}, c, { tipo: tipos[i], hecho: false, mk });
    });
  }
  function registrarCasa(c, derribada) {
    c.hecho = true; scene.remove(c.mk);
    const ax = c.px - c.x, az = c.pz - c.z, d = Math.hypot(ax, az) || 1, ux = ax / d, uz = az / d;
    if (derribada) {
      if (c.tipo === 'civ') { G.civiles = (G.civiles || 0) + 2; aviso('Había civiles en la casa derribada', 4); }
      else if (c.tipo === 'ins') { G.bajas += 2; aviso('Los insurgentes de la casa han caído con ella', 3); }
      return;
    }
    if (c.tipo === 'ins') {
      for (let k = 0; k < 2; k++) { const s = crearSoldado('E', c.px + uz * (k ? 1.2 : -1.2), c.pz - ux * (k ? 1.2 : -1.2), k + G.sold.length, { fase: G.faseI, estado: 'asomado', alerta: true, muro: false, t: rnd(3, 5), apunta: rnd(0.7, 1.1), spotYaw: 0 }); s.yaw = Math.atan2(-(P.pos.x - s.pos.x), -(P.pos.z - s.pos.z)); }
      voz('enemigo', null, 1); cartel('¡INSURGENTES!'); aviso('¡Salen armados de la casa!', 2.5);
    } else if (c.tipo === 'civ') {
      for (let k = 0; k < 2; k++) { const s = crearSoldado('C', c.px + uz * (k ? 0.9 : -0.9), c.pz - ux * (k ? 0.9 : -0.9), k * 3 + 2 + G.sold.length, { civil: true, vida: 40, dest: { x: c.px + ux * rnd(4, 7) + uz * (k ? 3 : -3), z: c.pz + uz * rnd(4, 7) - ux * (k ? 3 : -3) } }); s.arma.visible = false; s.yaw = Math.atan2(-ux, -uz) + Math.PI; }
      aviso('Civiles: salen con las manos en alto. ¡No dispares!', 3.5);
    } else aviso('Casa vacía', 1.8);
  }
  function actualizaCasas() {
    if (!G_casas) return 0; let pend = 0; const alc = G.carro ? 8 : 3.4;
    for (const c of G_casas) { if (c.hecho) continue; if (!P.muerto && !G.vuelo && Math.hypot(c.px - P.pos.x, c.pz - P.pos.z) < alc) registrarCasa(c); else pend++; }
    return pend;
  }
  function limpiarEscena() { fuegos.length = 0; gotas.length = 0; manchas.length = 0; charcos.length = 0; scene.traverse(o => { if (o.geometry && o.geometry.dispose && o.parent === scene && !o.isInstancedMesh) o.geometry.dispose(); }); efectos.length = 0; trazas.length = 0; }
  function construir(m) {
    limpiarEscena(); scene = new THREE.Scene(); World.build(m, scene); scene.add(cam);
    const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.marca, depthTest: false, transparent: true, sizeAttenuation: false, fog: false }));
    mk.scale.set(0.035, 0.035, 1); mk.renderOrder = 10; scene.add(mk);
    return mk;
  }
  function empezar(i) {
    Snd.musica(false);
    misionIdx = i; const m = MISIONES[i], v = Progreso.ventajas();
    m.fases.forEach(f => { delete f._spots; delete f._casas; }); G_casas = null;
    const marca = construir(m), nAli = m.aliados + v.esc;
    G = { m, sold: [], proy: [], faseI: -1, fase: null, marca, bajas: 0, bajasJ: 0, cabezas: 0, tiros: 0, aciertos: 0, minVida: 100, recT: 0, cool: 0, viva: 0, vivaCD: 0, vivaN: 0, temblor: 0, flashT: 0, dirT: 0, finT: 0, cambioT: 0, t: 0, gritoBat: rnd(10, 16), flareT: 4, avion: null, asalto: false, fin: false, aliadosIni: nAli, revivido: false, pedido: 0 };
    equiparArmas();
    Object.assign(P, { yaw: 0, pitch: -0.02, vida: 100, curas: 2 + v.cura, agach: false, mira: false, arma: 0, granadas: 3 + v.gran + ((Progreso.P.extras || {}).bolsa ? 2 : 0), avion: (m.avion || 0) + (m.avion ? v.avion : 0), muerto: false, retroceso: 0 });
    P.pos.set(m.inicio[0], 0, m.inicio[1]); P.pos.y = H(P.pos.x, P.pos.z);
    G.nido = null; G.salto = null; mg.g.visible = false; G.carro = null; G.caza = null; G.rescate = null; G.restos = null; $('mira').style.transform = '';
    if (m.caza) { // caza Buchón en cabecera de pista, motor al ralentí
      const av = World.buchon(); scene.add(av);
      G.caza = { m: av, pos: new V3(m.pista.x, World.refs.pistaY + 1.93, m.pista.z0 - 6), yaw: 0, pitch: 0, roll: 0, v: 0, suelo: true, gasT: 6, mun: 240, cohetes: 8, cT: 0, n: 0, lastYaw: 0, lastPitch: 0, aterrizando: false, avisoT: 0 };
      P.yaw = 0; P.pitch = 0;
    }
    if (G_camp && G_camp.lleva) { const L = G_camp.lleva; P.vida = Math.max(55, L.vida); P.curas = Math.max(P.curas, L.curas); P.granadas = Math.max(P.granadas, L.granadas); }
    Snd.narrar(null);
    G.orden = 'auto'; $('bOrden').innerHTML = 'ORDEN<br>AUTO'; $('bOrden').style.visibility = m.nido || m.caza ? 'hidden' : '';
    G.diaria = G_diaria && G_diaria.idx === i ? G_diaria : null; G_diaria = null;
    if (G.diaria) { const md = G.diaria.mod.id; if (md === 'sinCuras') P.curas = 0; if (md === 'sinGranadas') P.granadas = 0; G.difX = md === 'duro' ? 1.35 : 1; }
    if (m.carro) {
      const c = World.carro(); scene.add(c.g);
      G.carro = Object.assign(c, { yaw: 0, vel: 0, rec: 0, obuses: 48, mgT: 0, n: 0, polvoT: 0, cab: 0, bal: 0, retro: 0 });
      // el resto de la sección: dos carros más que avanzan a los flancos y baten la posición
      G.carros = [-1, 1].map(lado => { const a = World.carro(); scene.add(a.g); return Object.assign(a, { pos: new V3(m.inicio[0] + lado * 16, 0, m.inicio[1] + 4), yaw: 0, lado, t: rnd(4, 7), polvoT: 0, vel: 0 }); });
    }
    G.camiones = null;
    if (m.convoy) { G.convoy = 100; G.camiones = [0, 1, 2].map(i => { const c = World.camion(); const z = m.inicio[1] + 12 + i * 12; c.pos = new V3(World.pathX(z), 0, z); scene.add(c.g); return c; }); }
    $('bFuego').textContent = m.carro || m.caza ? 'CAÑÓN' : 'FUEGO'; $('fuego2').textContent = m.caza ? 'COHETE' : m.carro ? 'AMETR.' : 'FUEGO';
    ['bAgach', 'bArma', 'bGran', 'bRec'].forEach(id => $(id).style.visibility = m.carro || m.caza ? 'hidden' : ''); ['bCura', 'bMira', 'bViva'].forEach(id => $(id).style.visibility = m.caza ? 'hidden' : '');
    if (m.salto) {
      // el Junkers entra sobre la zona de salto; el jugador va en la puerta y la sección salta con él
      const av = World.avion(); av.position.set(m.inicio[0], H(m.inicio[0], m.inicio[1]) + m.salto.alt, m.inicio[1] + 60); scene.add(av);
      G.salto = { fase: 'puerta', t: 0, avion: av, vel: new V3(), nAli, campana: null };
      P.yaw = -Math.PI / 2; P.pitch = -0.25; Snd.avion();
    } else if (m.nido) {
      for (let k = 0; k < Math.min(nAli, 6); k++) {
        const x = m.inicio[0] + (k % 2 ? 1 : -1) * (4 + Math.floor(k / 2) * 3.6);
        crearSoldado('L', x, m.inicio[1], k, { hueco: k, muralla: true, elev: 4.4, cad: rnd(2.2, 3.4), nombre: NOMBRES[k % NOMBRES.length] });
      }
    } else if (m.caza) { /* el piloto vuela solo */ } else for (let k = 0; k < (G.diaria && G.diaria.mod.id === 'pocos' ? Math.ceil(nAli / 2) : nAli); k++) {
      const cmp = k === 0 ? Progreso.P.companero : null; // el legionario de un amigo, con su aspecto, en el primer puesto de la escuadra
      const h = huecos[k % huecos.length], s = crearSoldado('L', P.pos.x + h[0], P.pos.z + h[1], k, { hueco: k, cad: cmp ? 1.9 : rnd(2.2, 3.4), nombre: cmp ? cmp.n : NOMBRES[k % NOMBRES.length], av: cmp ? cmp.av : null, amigo: !!cmp });
      if (k === 1 || (cmp && cmp.a && cmp.a !== 'mauser' && !/astra|star/.test(cmp.a))) s.tipoArma = 'fao';
      if (cmp) { s.vida = 140; setTimeout(() => G && G.m === m && aviso('Te acompaña el legionario ' + cmp.n, 3.5), 7000); }
    }
    jugando = true; pausado = false;
    ['menu', 'parte', 'fin', 'revivir', 'portada'].forEach(id => $(id).hidden = true);
    $('parche').hidden = !(Progreso.P.heridas.ojo && Progreso.P.mostrarHeridas);
    $('hud').hidden = $('mandos').hidden = false;
    siguienteFase();
    if (m.id === 'perimetro' && !Progreso.P.hechas.perimetro) {
      const pasos = tactil ? ['Arrastra en la mitad izquierda para moverte y en la derecha para apuntar', 'FUEGO dispara. MIRA apunta con precisión', 'AGACHAR tras los sacos te cubre. RECARGA cuando haya calma', 'Las flechas rojas señalan a los enemigos que te han visto', 'El botón ¡VIVA! sube la moral de la escuadra']
        : ['W A S D para moverte, ratón para apuntar', 'Clic izquierdo dispara, clic derecho apunta', 'C te agacha tras los sacos, R recarga, G lanza una granada', 'Las flechas rojas señalan a los enemigos que te han visto', 'V grita ¡VIVA! y sube la moral de la escuadra'];
      pasos.forEach((t, i) => setTimeout(() => { if (G && G.m === m && jugando && !P.muerto) aviso(t, 5); }, 4500 + i * 8000));
    }
    if (m.salto) { aviso('Luz roja: prepárate en la puerta del Junkers', 4); return; }
    if (m.avion && !m.salto) setTimeout(() => { if (G && G.m === m && jugando && P.avion > 0) aviso('Tienes una pasada de aviación: pulsa ✈ AVIÓN (arriba a la derecha) y pilotas tú el Heinkel', 6); }, 9000);
    if (m.caza) { $('bFuego').textContent = 'GAS'; aviso('Pulsa GAS para lanzar el motor: el avión despega solo al coger velocidad', 7); return; }
    if (m.carro) aviso('Mandas una sección de tres M-24: joystick para conducir, CAÑÓN y AMETR. para disparar', 5);
    Snd.corneta(m.noche ? 'diana' : 'ataque');
    setTimeout(() => G && G.m === m && voz('luchar', '¡LEGIONARIOS, A LUCHAR!', 1), 2600);
    setTimeout(() => G && G.m === m && (Snd.voz('coro_viva', 0.9), cartel('¡VIVA!')), 6200);
  }
  function siguienteFase() {
    G.faseI++;
    const f = G.fase = G.m.fases[G.faseI];
    if (!f) return victoria();
    G.faseT = 0; G.disparada = false; G.asalto = false; G.avisoEnemigo = false; G.desborde = 0; G.morteroT = rnd(16, 24); G.contraHecho = false;
    if (f.tipo === 'take') {
      const spots = f._spots.slice().sort(() => Math.random() - 0.5);
      for (let k = 0; k < f.n; k++) {
        const sp = spots[k % spots.length], off = k >= spots.length ? 2.5 : 0;
        const s = crearSoldado('E', sp.x + rnd(-off, off), sp.z + rnd(-off, off), k, { fase: G.faseI, spotYaw: sp.yaw, muro: sp.muro && off === 0, estado: 'idle' });
        s.yaw = sp.yaw; if (k % 5 === 3) s.tipoArma = 'fao';
        if (G.caza && k < 3) { s.aa = true; s.tipoArma = 'fao'; } // tiradores antiaéreos
        if (k === 0 && !G.caza && !G.m.fases.slice(G.faseI + 1).some(x => x.tipo === 'take')) { s.jefe = true; s.vida = 240; s.tipoArma = 'fao'; s.g.scale.setScalar(1.12); }
      }
      if (G.columna) { scene.remove(G.columna); G.columna = null; }
      if (G.caza) { const c = new THREE.Mesh(new THREE.CylinderGeometry(5, 2.5, 120, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false })); const ax = f.x - G.m.inicio[0], az = f.z - G.m.inicio[1], d = Math.hypot(ax, az) || 1; c.position.set(f.x + ax / d * 34, H(f.x, f.z) + 60, f.z + az / d * 34); scene.add(c); G.columna = c; }
      prepararCasas(f); if (G_casas) setTimeout(() => G && G.fase === f && aviso('Registra las casas una a una: puede haber insurgentes o civiles', 5), 3500);
      aviso(f.nom, 3);
      if (G.faseI > 0) { Snd.corneta('ataque'); setTimeout(() => G && voz('adelante', '¡ADELANTE, LEGIONARIOS!'), 1700); }
    } else if (f.tipo === 'tiradores') { // tiradores escogidos a mucha distancia: hay que buscarlos con la mira
      G_casas = null;
      for (let k = 0; k < f.n; k++) {
        const x = clamp(P.pos.x + (k - (f.n - 1) / 2) * rnd(26, 38) + rnd(-8, 8), -140, 140), z = clamp(P.pos.z - rnd(95, 135), -250, 255);
        const s = crearSoldado('E', x, z, k + G.sold.length, { fase: G.faseI, estado: 'cubierto', alerta: true, muro: false, tirador: true, t: rnd(0.5, 3), cad: 3.4, spotYaw: 0 }); s.yaw = Math.PI;
      }
      voz('enemigo', null, 1); aviso(f.nom + ': cúbrete y búscalos con la MIRA', 4.5);
    } else if (f.tipo === 'carga') { // se echan encima a la carrera: combate a quemarropa
      G_casas = null;
      for (let k = 0; k < f.n; k++) {
        const a = P.yaw + rnd(-1.9, 1.9), d = rnd(40, 58), x = clamp(P.pos.x - Math.sin(a) * d, -145, 145), z = clamp(P.pos.z - Math.cos(a) * d, -250, 255);
        crearSoldado('E', x, z, k + G.sold.length, { fase: G.faseI, estado: 'carga', alerta: true, vel: rnd(4.2, 5.2), golpeT: 0.4, t: 0 });
      }
      voz('emboscada', '¡A LA BAYONETA!', 1); aviso('¡Se os echan encima! Fuego a discreción y CUCHILLO al que llegue', 4);
    } else if (f.tipo === 'hold') { G_casas = null; G.holdT = f.t; G.oleada = 3; aviso(f.nom + ': ponte tras los sacos', 3.5); }
    else if (f.tipo === 'nido') {
      G.nido = { calor: 0, mun: 100, cintas: 9, rec: 0, bloqueo: false, n: 0 }; G.holdT = f.t; G.oleada = 4; G.muro = 100; P.yaw = 0; P.pitch = -0.08;
      aviso('Ametralladora en la muralla: que nadie llegue al pie del muro', 4);
    }
    else aviso(f.nom, 3);
  }
  function faseCumplida(txt) {
    const f = G.fase; G.fase = null; if (G.columna) { scene.remove(G.columna); G.columna = null; }
    if (f.tipo !== 'reach') {
      voz(f.tipo === 'take' ? 'tomada' : 'viva_legion', f.tipo === 'take' ? '¡POSICIÓN TOMADA!' : '¡VIVA LA LEGIÓN!');
      setTimeout(() => { if (!G) return; const e = Math.random() < 0.5; Snd.voz(e ? 'coro_espana' : 'coro_legion', 1); cartel(e ? '¡VIVA ESPAÑA!' : '¡VIVA LA LEGIÓN!'); }, 1500);
    }
    if (txt) aviso(txt, 3);
    setTimeout(() => { if (G && !G.fin) siguienteFase(); }, 3800);
  }
  function actualizaFase(dt) {
    const f = G.fase; if (!f) return;
    G.faseT += dt;
    const dObj = Math.hypot(P.pos.x - f.x, P.pos.z - f.z);
    if (f.tipo === 'take') {
      const n = enemigosVivos();
      if (!G.avisoEnemigo && n.some(e => e.alerta)) { G.avisoEnemigo = true; voz('enemigo', null, 0.9, 0); }
      if (!G.asalto && dObj < 38 && n.length) { G.asalto = true; voz('asalto', '¡AL ASALTO!'); setTimeout(() => G && voz('a_mi_b', null, 0.8, -0.4), 1300); }
      if (f.n >= 9 && n.length >= 4 && n.some(e => e.alerta) && dObj > 22 && !G.caza) {
        G.morteroT -= dt;
        if (G.morteroT <= 0) { // mortero enemigo: silba, avisa y cae donde estabas
          G.morteroT = rnd(15, 26) / AJ.dif;
          const fin = new V3(P.pos.x + rnd(-6, 6), 0, P.pos.z + rnd(-6, 6)); fin.y = H(fin.x, fin.z);
          G.proy.push({ tipo: 'mortero', t: 2.8, fin }); Snd.silbido(0); setTimeout(() => Snd.silbido(0), 900); aviso('¡Mortero! ¡Muévete!', 2.4);
        }
      }
      const aliCerca = G.sold.some(s => s.team === 'L' && !s.muerto && Math.hypot(s.pos.x - f.x, s.pos.z - f.z) < 16);
      if (n.length && n.length <= 2 && (dObj < 20 || aliCerca)) { G.desborde += dt; if (G.desborde > 8) { for (const s of n) { s.estado = 'huye'; s.dest = { x: s.pos.x + rnd(-30, 30), z: s.pos.z - 150 }; s.fase = -1; } aviso('Los últimos defensores huyen', 2.5); } } else G.desborde = 0;
      const pendCasas = G.caza ? 0 : actualizaCasas();
      const blancosQ = G.caza ? World.blancosVivos(f) : 0;
      G.obj2 = G.caza ? 'Blancos por destruir: ' + blancosQ + ' · tiradores: ' + n.length : (n.length ? 'Enemigos en la posición: ' + n.length : pendCasas ? 'Registra las casas' : 'Ocupa la posición') + (pendCasas ? ' · casas por registrar: ' + pendCasas : '');
      if (G.caza && !blancosQ) { for (const s of n) { s.estado = 'huye'; s.dest = { x: s.pos.x + rnd(-30, 30), z: s.pos.z - 150 }; s.fase = -1; } return faseCumplida('Posición batida'); }
      if (!n.length && !pendCasas && dObj < 16 && f.contra && !G.contraHecho) { // la posición cae, pero el enemigo vuelve a por ella
        G.contraHecho = true;
        const ax = f.x - G.m.inicio[0], az = f.z - G.m.inicio[1], d = Math.hypot(ax, az) || 1, ux = ax / d, uz = az / d;
        for (let k = 0; k < f.contra; k++) {
          const lat = rnd(-45, 45), lej = rnd(75, 105), x = clamp(f.x + ux * lej - uz * lat, -145, 145), z = clamp(f.z + uz * lej + ux * lat, -250, 255);
          const s = crearSoldado('E', x, z, k + G.sold.length, { fase: G.faseI, estado: 'avanza', alerta: true, dest: { x: f.x + rnd(-11, 11), z: f.z + rnd(-11, 11) }, vel: rnd(3, 3.9), t: rnd(3, 6) }); if (k === 0) s.tipoArma = 'fao';
        }
        voz('enemigo', '¡CONTRAATAQUE!', 1); aviso('¡Contraataque! Aguanta la posición tras los parapetos', 3.5); Snd.corneta('diana');
      } else
      if (!G.caza && !n.length && !pendCasas && dObj < 16) faseCumplida('Posición asegurada');
    } else if (f.tipo === 'hold') {
      const dentro = dObj < 22;
      if (dentro) G.holdT -= dt;
      G.oleada -= dt;
      if (G.oleada <= 0 && G.holdT > 8) {
        G.oleada = f.cada;
        for (let k = 0; k < f.n; k++) {
          const x = f.x + rnd(-60, 60), z = f.z - rnd(85, 125);
          const s = crearSoldado('E', x, z, k + G.sold.length, { fase: G.faseI, estado: 'avanza', alerta: true, dest: { x: f.x + rnd(-25, 25), z: f.z - rnd(18, 34) }, vel: rnd(2.6, 3.6), t: rnd(2, 5) });
          s.yaw = 0; if (Math.random() < 0.15) s.tipoArma = 'fao';
        }
        if (G.faseT < 5) voz('enemigo', null, 0.9);
      }
      const mm = Math.max(0, Math.ceil(G.holdT));
      G.obj2 = (dentro ? 'Resiste: ' : 'Vuelve a la posición · ') + Math.floor(mm / 60) + ':' + String(mm % 60).padStart(2, '0');
      if (G.holdT <= 0) { for (const s of enemigosVivos()) { s.estado = 'huye'; s.dest = { x: s.pos.x + rnd(-20, 20), z: s.pos.z - 160 }; s.fase = -1; } faseCumplida('El enemigo se retira'); }
    } else if (f.tipo === 'ambush') {
      if (!G.disparada && (dObj < 45 || P.pos.z < f.z + 20)) {
        G.disparada = true;
        f._spots.forEach((sp, k) => { const s = crearSoldado('E', sp.x, sp.z, k + 3, { fase: G.faseI, estado: 'cubierto', alerta: true, muro: true, t: rnd(0.2, 1.5), spotYaw: sp.yaw }); s.yaw = sp.yaw; if (k % 4 === 2) s.tipoArma = 'fao'; });
        voz('emboscada', '¡EMBOSCADA!'); aviso('¡Cuerpo a tierra! Busca cobertura', 3);
      }
      const n = G.disparada ? enemigosVivos().length : -1;
      G.obj2 = n < 0 ? 'Avanza con cuidado' : 'Enemigos: ' + n;
      if (G.disparada && n === 0) faseCumplida('Emboscada rechazada');
    } else if (f.tipo === 'nido') {
      G.holdT -= dt; G.oleada -= dt;
      if (G.oleada <= 0 && G.holdT > 12) {
        G.oleada = f.cada * rnd(0.8, 1.2);
        const n = f.n + Math.floor(G.faseT / 45), cx = rnd(-75, 75);
        for (let k = 0; k < n; k++) {
          const x = clamp(cx + rnd(-16, 16), -140, 140), z = f.z - rnd(130, 185);
          const s = crearSoldado('E', x, z, k + G.sold.length, { fase: G.faseI, estado: 'avanza', alerta: true, dest: { x: f.x + rnd(-13, 13), z: f.z - 4.5 - rnd(0, 5) }, vel: rnd(2.8, 3.9), t: rnd(3, 6) });
          s.yaw = 0; if (Math.random() < 0.12) s.tipoArma = 'fao';
        }
        if (Math.random() < 0.5) voz('enemigo', null, 0.9);
        aviso('¡Oleada por ' + (cx < -25 ? 'la izquierda' : cx > 25 ? 'la derecha' : 'el frente') + '!', 2);
      }
      for (const s of enemigosVivos()) {
        if (Math.abs(s.pos.z - (f.z - 2)) < 9 && Math.abs(s.pos.x - f.x) < 19) {
          s.enMuro = (s.enMuro || 0) + dt;
          if (s.enMuro > 4) { s.muerto = true; s.estado = 'muerto'; scene.remove(s.g); G.muro = Math.max(0, G.muro - 20); G.temblor = 0.4; aviso('¡Están escalando la muralla! Muralla al ' + G.muro + ' %', 2.5); voz('cubridme', null, 0.9); }
        }
      }
      if (G.muro <= 0 && !P.muerto) { P.muerto = true; P.vida = 0; G.finT = 2.5; aviso('El enemigo ha entrado en el fuerte', 4); }
      const mm = Math.max(0, Math.ceil(G.holdT));
      G.obj2 = 'Resiste ' + Math.floor(mm / 60) + ':' + String(mm % 60).padStart(2, '0') + ' · muralla ' + G.muro + ' %';
      if (G.holdT <= 0) { for (const s of enemigosVivos()) { s.estado = 'huye'; s.dest = { x: s.pos.x + rnd(-20, 20), z: s.pos.z - 160 }; s.fase = -1; } faseCumplida('¡Llega la VI Bandera y se rompe el cerco!'); }
    } else if (f.tipo === 'tiradores' || f.tipo === 'carga') {
      const n = enemigosVivos().length;
      G.obj2 = f.tipo === 'tiradores' ? 'Tiradores: ' + n + ' · usa la MIRA' : 'Enemigos a la carga: ' + n;
      if (!n) faseCumplida(f.tipo === 'tiradores' ? 'Cresta limpia' : 'Carga rechazada');
    } else if (f.tipo === 'rescate') { /* lo lleva actualizaRescate */
    } else if (f.tipo === 'aterriza') { G.obj2 = 'Baja de 45 m y enfila la pista por su cabecera';
    } else if (f.tipo === 'reach') { G.obj2 = 'Sin enemigos a la vista'; if (dObj < 12) faseCumplida(G.camiones ? 'El convoy ha llegado' : 'Has alcanzado la columna'); }
  }
  function actualizaConvoy(dt) {
    const enem = G.fase ? enemigosVivos().filter(e => e.alerta) : [];
    G.camiones.forEach((c, i) => {
      // siguen la pista detrás del jugador y se paran bajo el fuego
      const zObj = P.pos.z + 13 + i * 12;
      if (!enem.length && c.pos.z > zObj) c.pos.z -= Math.min(6 * dt, c.pos.z - zObj);
      c.pos.x = World.pathX(c.pos.z); const h1 = H(c.pos.x, c.pos.z - 2.4), h2 = H(c.pos.x, c.pos.z + 2.4);
      c.pos.y = (h1 + h2) / 2; c.g.position.copy(c.pos); c.g.rotation.set(Math.atan2(h1 - h2, 4.8), Math.atan2(-(World.pathX(c.pos.z - 3) - c.pos.x), 3), 0, 'YXZ');
      if (G.convoy < 55 && Math.random() < dt * (G.convoy < 25 ? 6 : 2.5) && i === (G.convoy < 25 ? Math.floor(Math.random() * 3) : 0)) particula(new V3(c.pos.x, c.pos.y + 2.2, c.pos.z - 2), 0x2a2622, 1.4, rnd(2, 3.5), 2.5, 1.6);
    });
    if (enem.length && !P.muerto) {
      G.convoy = Math.max(0, G.convoy - dt * (0.35 + enem.length * 0.07) * AJ.dif);
      if (Math.random() < dt * 0.8) { const c = G.camiones[Math.floor(Math.random() * 3)]; polvo(new V3(c.pos.x + rnd(-1, 1), c.pos.y + rnd(0.5, 2), c.pos.z + rnd(-2.5, 2.5)), 1, 0.4); }
      if (G.convoy <= 0) { P.muerto = true; P.vida = 0; G.finT = 2.5; aviso('El convoy ha sido destruido', 4); explotar(G.camiones[0].pos.clone(), 6, 0, false); }
    }
  }
  // objetivos de mérito: tres por misión, con premio en pesetas y estrellas
  function meritos(m) {
    const par = m.par || (m.fases.length * 110 + 60);
    return [
      { t: 'Sin perder un solo hombre', ok: r => r.vivos >= r.aliadosIni },
      { t: 'Cuatro tiros a la cabeza', ok: r => r.cabezas >= 4 },
      { t: 'En menos de ' + Math.floor(par / 60) + ':' + String(par % 60).padStart(2, '0'), ok: r => r.tiempo <= par }
    ];
  }
  // orden del día: una misión con una condición, distinta cada día, con premio
  const MODS = [{ id: 'sinCuras', t: 'sin vendas' }, { id: 'pocos', t: 'con media escuadra' }, { id: 'duro', t: 'contra tiradores escogidos' }, { id: 'sinGranadas', t: 'sin granadas' }];
  let G_diaria = null;
  function diaria() {
    const d = new Date(), dia = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); let h = 0; for (const c of dia) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const lista = MISIONES.map((m, i) => i).filter(i => !MISIONES[i].carro && !MISIONES[i].nido && !MISIONES[i].salto), idx = lista[h % lista.length], mod = MODS[(h >>> 5) % MODS.length], D = Progreso.P.diaria || {};
    return { dia, idx, mod, hecha: D.dia === dia && D.hecha, texto: MISIONES[idx].tit + ', ' + mod.t, premio: '₧ 400 y ◆ 2' };
  }
  window.IfniDiaria = { info: diaria, jugar() { G_diaria = diaria(); abrirParte(G_diaria.idx); } };
  // campaña: varias misiones seguidas como etapas; entre una y otra se conservan salud, vendas y granadas
  let G_camp = null;
  function informeHTML(c) {
    const hechas = c.etapas.filter(id => Progreso.P.hechas[id]).length;
    return '<div class="informe"><div class="retrato">' + Progreso.insignia(Math.max(0, Progreso.RANGOS.findIndex(x => x.nom === 'Sargento')), 54) + '<b>' + c.sargento + '</b><small>te informa</small></div><div>' + c.informe.map(p => '<p>' + p + '</p>').join('') + '</div></div>' +
      '<h3>Órdenes</h3><ol class="ordenes">' + c.etapas.map((id, k) => { const m = MISIONES.find(x => x.id === id); return '<li data-e="' + k + '" class="' + (Progreso.P.hechas[id] ? 'ok ' : '') + (G_camp && G_camp.i === k ? 'aqui' : '') + '"><b>' + m.tit + '</b> · ' + c.ordenes[k] + (G_camp && G_camp.i === k ? ' <i>← empiezas aquí</i>' : '') + '</li>'; }).join('') + '</ol><p class="nota">Toca una etapa de la lista para empezar por ella.</p>' +
      '<p class="nota">' + c.etapas.length + ' etapas seguidas. Si caes, repites solo la etapa en la que estabas, y si lo dejas a medias la campaña se retoma en esa etapa. Entre etapas conservas la salud, las vendas y las granadas.</p>' +
      (G_camp && G_camp.i > 0 ? '<p class="nota"><b>Retomas la campaña en la etapa ' + (G_camp.i + 1) + '.</b> <button type="button" class="mini" id="bDeCero">Empezar desde la etapa 1</button></p>' : '');
  }
  function abrirCampana(ci, desde) {
    Snd.init(); const c = CAMPANAS[ci]; G_diaria = null;
    G_camp = { ci, i: desde || 0, puntos: 0, pts: 0, lleva: null };
    misionIdx = MISIONES.findIndex(m => m.id === c.etapas[G_camp.i]);
    $('pDato').textContent = c.dato; $('pTit').textContent = c.tit; $('pTxt').innerHTML = informeHTML(c);
    document.querySelectorAll('#pTxt .ordenes li').forEach(li => li.onclick = () => { const k = +li.dataset.e; if (k !== G_camp.i) abrirCampana(ci, k); });
    if ($('bDeCero')) $('bDeCero').onclick = () => { (Progreso.P.campProg = Progreso.P.campProg || {})[c.id] = 0; Progreso.guardar(); abrirCampana(ci, 0); };
    $('menu').hidden = true; $('parte').hidden = false; $('parte').scrollTop = 0; Snd.musica(true); Snd.narrar('informe_' + c.id);
  }
  window.IfniCampana = { abrir: abrirCampana };
  function pasoEtapa() { // etapa cumplida: recuento breve y a la siguiente sin volver al menú
    jugando = false; pausado = true; $('hud').hidden = $('mandos').hidden = true; Snd.motor(-1);
    if (document.pointerLockElement) document.exitPointerLock();
    const res = resultado(true), m = G.m, c = CAMPANAS[G_camp.ci];
    const r = { vivos: G.sold.filter(s => s.team === 'L' && !s.muerto).length, aliadosIni: G.sold.filter(s => s.team === 'L').length, cabezas: G.cabezas, tiempo: G.t };
    const hechos = meritos(m).filter(x => x.ok(r)), PP = Progreso.P; PP.pts += hechos.length * 100; PP.estrellas = PP.estrellas || {}; PP.estrellas[m.id] = Math.max(PP.estrellas[m.id] || 0, hechos.length);
    if (G.civiles) PP.pts = Math.max(0, PP.pts - G.civiles * 200); (PP.campProg = PP.campProg || {})[c.id] = G_camp.i + 1; Progreso.guardar();
    G_camp.puntos += res.puntos; G_camp.pts += res.pts + hechos.length * 100; G_camp.lleva = { vida: P.vida, curas: P.curas, granadas: P.granadas }; G_camp.i++;
    const sig = MISIONES.find(x => x.id === c.etapas[G_camp.i]);
    $('eTit').textContent = 'Etapa ' + G_camp.i + ' de ' + c.etapas.length + ' cumplida';
    $('eTxt').innerHTML = '<p><b>' + m.tit + '</b> · ' + res.puntos.toLocaleString('es-ES') + ' puntos · ₧ ' + (res.pts + hechos.length * 100).toLocaleString('es-ES') + (hechos.length ? ' · ' + '★'.repeat(hechos.length) : '') + (G.civiles ? ' · civiles muertos: ' + G.civiles : '') + '</p>' +
      '<h3>Siguiente: ' + sig.tit + '</h3><p>' + c.ordenes[G_camp.i] + '.</p><p class="nota">' + sig.parte[sig.parte.length - 1] + '</p><p class="nota">Sigues con ' + Math.ceil(Math.max(55, P.vida)) + ' de salud.</p>';
    $('etapa').hidden = false; Snd.musica(true);
    $('bEtapa').onclick = () => { $('etapa').hidden = true; empezar(MISIONES.indexOf(sig)); };
    $('bEtapaMenu').onclick = () => { $('etapa').hidden = true; alMenu(); };
  }
  function resultado(ok) {
    const vivos = G.sold.filter(s => s.team === 'L' && !s.muerto).length;
    return Progreso.terminar({ ok, revivido: G.revivido, mision: G.m.id, dif: AJ.dif, bajas: G.bajas, bajasJ: G.bajasJ, cabezas: G.cabezas, tiros: G.tiros, aciertos: G.aciertos, vivos, aliadosIni: G.aliadosIni, minVida: G.minVida, vidaFinal: P.vida, tiempo: G.t });
  }
  function victoria() {
    G.fin = true;
    Snd.corneta('victoria'); setTimeout(() => G && Snd.voz('coro_legion', 1), 2400);
    setTimeout(() => { if (!G) return; if (G_camp && G_camp.i < CAMPANAS[G_camp.ci].etapas.length - 1) pasoEtapa(); else finPantalla(true); }, 3500);
  }
  async function finPantalla(ok) {
    jugando = false; pausado = true; $('hud').hidden = $('mandos').hidden = true; Snd.motor(-1);
    if (document.pointerLockElement) document.exitPointerLock();
    const res = resultado(ok), m = G.m;
    let extra = '';
    if (ok) {
      const r = { vivos: G.sold.filter(s => s.team === 'L' && !s.muerto).length, aliadosIni: G.sold.filter(s => s.team === 'L').length, cabezas: G.cabezas, tiempo: G.t };
      const ms = meritos(m), hechos = ms.filter(x => x.ok(r)), PP = Progreso.P;
      PP.pts += hechos.length * 100; PP.estrellas = PP.estrellas || {}; PP.estrellas[m.id] = Math.max(PP.estrellas[m.id] || 0, hechos.length);
      extra = '<p><b>Méritos:</b> ' + ms.map(x => (x.ok(r) ? '★ ' : '☆ ') + x.t).join(' · ') + (hechos.length ? ' · <b>+₧ ' + hechos.length * 100 + '</b>' : '') + '</p>';
      if (G.rescates) extra += '<p>Heridos salvados: ' + G.rescates + '</p>';
      if (G.civiles) { const pen = Math.min(PP.pts, G.civiles * 200); PP.pts -= pen; extra += '<p><b>Civiles muertos: ' + G.civiles + '</b> · sanción de ₧ ' + pen + '</p>'; }
      if (G.diaria) { const D = PP.diaria || {}; if (!(D.dia === G.diaria.dia && D.hecha)) { PP.diaria = { dia: G.diaria.dia, hecha: true }; PP.pts += 400; PP.oro += 2; extra += '<p><b>Orden del día cumplida:</b> +₧ 400 y ◆ 2</p>'; } }
      if (G_camp) { const c = CAMPANAS[G_camp.ci]; PP.campanas = PP.campanas || {}; PP.campanas[c.id] = 1; (PP.campProg = PP.campProg || {})[c.id] = 0; PP.pts += 300; extra = '<p><b>Campaña cumplida: ' + c.tit + '</b> · ' + c.etapas.length + ' etapas · ' + (G_camp.puntos + res.puntos).toLocaleString('es-ES') + ' puntos en total · premio de campaña ₧ 300</p>' + extra; }
      Progreso.guardar();
    }
    const enCampana = !!G_camp; if (ok) G_camp = null;
    await Progreso.Anuncios.intersticial();
    $('fDato').textContent = m.dato;
    $('fTit').textContent = ok ? 'Misión cumplida: ' + m.tit : 'Has caído en combate';
    $('fTxt').innerHTML = '<p>' + (ok ? m.historia : 'La misión ha fracasado. Vuelve a intentarlo.') + '</p>' + extra;
    UI.fin(res, ok);
    $('bSig').hidden = !ok || enCampana || misionIdx >= MISIONES.length - 1;
    $('fin').hidden = false;
  }
  // al caer: volver al combate una vez por misión a cambio de un vídeo
  function ofrecerRevivir() {
    if (G.revivido || Progreso.Anuncios.quedanHoy() <= 0) return finPantalla(false);
    pausado = true; $('mandos').hidden = true; $('revivir').hidden = false;
    $('bRevivir').onclick = async () => {
      $('revivir').hidden = true;
      if (await Progreso.Anuncios.recompensado()) { G.revivido = true; P.muerto = false; P.vida = 60; if (G.nido && G.muro <= 0) G.muro = 40; if (G.caza) { const C = G.caza; C.caido = false; C.m.visible = true; C.suelo = false; C.aterrizando = false; C.pos.y = sueloCaza(C.pos.x, C.pos.z) + 95; C.pitch = 0.1; C.roll = 0; C.v = 60; } if (G.camiones && G.convoy <= 0) G.convoy = 40; P.pitch = 0; G.finT = 0; pausado = false; $('mandos').hidden = false; aviso('¡Arriba, legionario!', 2); voz('a_mi', '¡A MÍ LA LEGIÓN!'); }
      else finPantalla(false);
    };
    $('bRendirse').onclick = () => { $('revivir').hidden = true; finPantalla(false); };
  }

  // ---------- bucle ----------
  const _f = new V3();
  function saltar() {
    const S = G.salto; if (!S || S.fase !== 'puerta') return;
    if (S.avion.position.z > G.m.salto.zVerde) { aviso('Luz roja: todavía no estamos sobre la zona', 1.5); return; }
    S.fase = 'caida'; S.t = 0; S.vel.set(0, -1, -32);
    voz('viva_espana', '¡VIVA ESPAÑA!', 1); setTimeout(() => G && Snd.voz('coro_viva', 0.8), 1100);
    // la sección salta en la misma pasada: unos delante y otros detrás, ya con la campana abierta
    const av = S.avion.position;
    for (let k = 0; k < S.nAli; k++) {
      const z = av.z + (k % 2 ? 1 : -1) * (12 + Math.floor(k / 2) * 11), x = av.x + rnd(-6, 6);
      const s = crearSoldado('L', x, z, k, { hueco: k, cad: rnd(2.2, 3.4), nombre: NOMBRES[k % NOMBRES.length] });
      if (k === 1) s.tipoArma = 'fao';
      s.pos.y = av.y - 12 - rnd(0, 14) + (k % 2 ? -8 : 6); s.yaw = rnd(-0.5, 0.5);
      const c = paracaidas(k % 3 ? 0xd9d2b8 : 0x8c8a62); s.g.add(c);
      s.aire = { vx: rnd(-0.8, 0.8), vz: -rnd(0.5, 2), vy: -rnd(5.2, 6.2), campana: c };
    }
  }
  function actualizaSalto(dt) {
    const S = G.salto, av = S.avion; S.t += dt;
    (av.userData.helices || []).forEach(h => h.rotation.z += dt * 38);
    if (av.parent) { av.position.z -= 44 * dt; if (av.position.z < -430) scene.remove(av); }
    if (S.fase === 'puerta') {
      P.pos.set(av.position.x + 0.75, av.position.y - 1.75, av.position.z + 2.2);
      if (!S.verde && av.position.z < G.m.salto.zVerde) { S.verde = true; aviso('¡LUZ VERDE! Pulsa FUEGO para saltar', 4); voz('adelante', '¡ADELANTE!', 0.9); }
      if (av.position.z < G.m.salto.zMin) { aviso('¡Fuera!', 1.5); saltar(); }
      return;
    }
    if (S.fase === 'caida') {
      S.vel.y -= 9.8 * dt; S.vel.z *= 1 - Math.min(1, dt * 1.4);
      P.pos.addScaledVector(S.vel, dt); G.temblor = Math.max(G.temblor, 0.35);
      if (S.t > 1.7) {
        S.fase = 'campana'; S.campana = paracaidas(0xd9d2b8); scene.add(S.campana); G.temblor = 0.9; S.vel.y = -9;
        aviso('¡Campana abierta! Guía con el joystick y dispara desde el aire', 3.5);
      }
    } else {
      let mx = mov.x, my = mov.y;
      if (teclas.KeyW) my -= 1; if (teclas.KeyS) my += 1; if (teclas.KeyA) mx -= 1; if (teclas.KeyD) mx += 1;
      const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), vh = 4.5;
      S.vel.x += ((mx * cy + my * sy) * vh - S.vel.x) * Math.min(1, dt * 1.5);
      S.vel.z += ((-mx * sy + my * cy) * vh - S.vel.z) * Math.min(1, dt * 1.5);
      S.vel.y += (-5.8 - S.vel.y) * Math.min(1, dt * 2);
      P.pos.addScaledVector(S.vel, dt);
      P.pos.x = clamp(P.pos.x, -150, 150); P.pos.z = clamp(P.pos.z, -255, 262);
      S.campana.position.copy(P.pos); S.campana.rotation.z = Math.sin(G.t * 0.9) * 0.06 - S.vel.x * 0.02; S.campana.rotation.x = S.vel.z * 0.02;
      const h = H(P.pos.x, P.pos.z);
      if (P.pos.y <= h) {
        P.pos.y = h; S.fase = 'suelo'; scene.remove(S.campana); G.temblor = 0.7; polvo(P.pos, 4, 0.8);
        aviso('¡En tierra! Reúnete con la sección', 3); voz('a_mi', '¡A MÍ LA LEGIÓN!', 1);
        setTimeout(() => G && Snd.corneta('ataque'), 1200);
      }
    }
  }
  function actualizaCarro(dt) {
    const C = G.carro;
    let mx = mov.x, my = mov.y;
    if (teclas.KeyW) my -= 1; if (teclas.KeyS) my += 1; if (teclas.KeyA) mx -= 1; if (teclas.KeyD) mx += 1;
    if (P.muerto) mx = my = 0;
    C.vel += (clamp(-my, -0.5, 1) * 7.5 - C.vel) * Math.min(1, dt * 1.6);
    C.yaw -= clamp(mx, -1, 1) * dt * (0.55 + 0.35 * Math.min(1, Math.abs(C.vel) / 4)) * (C.vel < -0.3 ? -1 : 1);
    const px = P.pos.x, pz = P.pos.z;
    P.pos.x -= Math.sin(C.yaw) * C.vel * dt; P.pos.z -= Math.cos(C.yaw) * C.vel * dt;
    World.colisiona(P.pos, 2.1);
    if (Math.hypot(P.pos.x - px, P.pos.z - pz) < Math.abs(C.vel) * dt * 0.4) C.vel *= 0.85;
    P.pos.x = clamp(P.pos.x, -150, 150); P.pos.z = clamp(P.pos.z, -255, 262); P.pos.y = H(P.pos.x, P.pos.z);
    P.mov = 0;
    // la barcaza sigue el terreno; la torre sigue la mirada
    const sy = Math.sin(C.yaw), cy = Math.cos(C.yaw), hA = H(P.pos.x - sy * 2.2, P.pos.z - cy * 2.2), hB = H(P.pos.x + sy * 2.2, P.pos.z + cy * 2.2), hI = H(P.pos.x - cy * 1.2, P.pos.z + sy * 1.2), hD = H(P.pos.x + cy * 1.2, P.pos.z - sy * 1.2);
    C.cab += (Math.atan2(hA - hB, 4.4) - C.cab) * Math.min(1, dt * 5); C.bal += (Math.atan2(hD - hI, 2.4) - C.bal) * Math.min(1, dt * 5);
    C.g.position.set(P.pos.x, (hA + hB + hI + hD) / 4, P.pos.z); C.g.rotation.set(C.cab, C.yaw, C.bal, 'YXZ');
    let dy = P.yaw - C.yaw - C.torre.rotation.y; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
    C.torre.rotation.y += clamp(dy, -dt * 1.6, dt * 1.6);
    C.retro *= Math.pow(0.02, dt);
    C.cuna.rotation.x += (clamp(P.pitch + 0.1, -0.17, 0.35) - C.cuna.rotation.x) * Math.min(1, dt * 6); C.cuna.position.z = -1.15 + C.retro;
    // polvo de las cadenas y enemigos arrollados
    if (Math.abs(C.vel) > 1) { C.polvoT -= dt; if (C.polvoT <= 0) { C.polvoT = 0.09; for (const l of [-1.2, 1.2]) particula(new V3(P.pos.x + cy * l + sy * 2.6, P.pos.y + 0.3, P.pos.z - sy * l + cy * 2.6), 0xc9a982, 1.1, rnd(1, 1.8), 2.4, 0.5); } }
    if (Math.abs(C.vel) > 2) for (const s of G.sold) if (s.team === 'E' && !s.muerto && dist2D(s.pos, P.pos) < 2.3) { sangre(new V3(s.pos.x, s.pos.y + 0.8, s.pos.z), null, true); herir(s, 999, P.pos, true); }
    if (C.rec > 0) { C.rec -= dt; if (C.rec <= 0) { C.rec = 0; Snd.cerrojo(); } }
    actualizaCarrosAliados(dt);
    Snd.motor(P.muerto ? -1 : Math.min(1, Math.abs(C.vel) / 7.5));
  }
  function actualizaCarrosAliados(dt) {
    const f = G.fase, enem = f ? enemigosVivos() : [];
    for (const c of G.carros) {
      let dest = null;
      if (f) {
        const dx = G.m.inicio[0] - f.x, dz = G.m.inicio[1] - f.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, dist = enem.length ? 62 : 26;
        dest = { x: f.x + ux * dist - uz * c.lado * 24, z: f.z + uz * dist + ux * c.lado * 24 };
        if (Math.hypot(c.pos.x - f.x, c.pos.z - f.z) < Math.hypot(P.pos.x - f.x, P.pos.z - f.z) - 30) dest = null; // no se adelanta al jefe de sección
      }
      let v = 0;
      if (dest) {
        const dx = dest.x - c.pos.x, dz = dest.z - c.pos.z, d = Math.hypot(dx, dz);
        if (d > 5) {
          let dy = Math.atan2(-dx, -dz) - c.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
          c.yaw += clamp(dy, -dt * 0.7, dt * 0.7); v = Math.abs(dy) < 0.6 ? 5.5 : 1.5;
        }
      }
      c.vel += (v - c.vel) * Math.min(1, dt * 1.5);
      c.pos.x -= Math.sin(c.yaw) * c.vel * dt; c.pos.z -= Math.cos(c.yaw) * c.vel * dt; World.colisiona(c.pos, 2.1);
      const dj = dist2D(c.pos, P.pos); if (dj < 7) { c.pos.x += (c.pos.x - P.pos.x) / (dj || 1) * dt * 6; c.pos.z += (c.pos.z - P.pos.z) / (dj || 1) * dt * 6; }
      const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw), hA = H(c.pos.x - sy * 2.2, c.pos.z - cy * 2.2), hB = H(c.pos.x + sy * 2.2, c.pos.z + cy * 2.2);
      c.pos.y = (hA + hB) / 2; c.g.position.copy(c.pos); c.g.rotation.set(Math.atan2(hA - hB, 4.4), c.yaw, 0, 'YXZ');
      if (c.vel > 1) { c.polvoT -= dt; if (c.polvoT <= 0) { c.polvoT = 0.14; particula(new V3(c.pos.x + sy * 2.6, c.pos.y + 0.3, c.pos.z + cy * 2.6), 0xc9a982, 1.3, rnd(1, 1.8), 2.4, 0.5); } }
      // fuego: gira la torre hacia un enemigo y dispara
      c.t -= dt;
      if (!c.obj || c.obj.muerto) c.obj = enem.length ? enem[Math.floor(Math.random() * enem.length)] : null;
      if (c.obj) {
        let dy = Math.atan2(-(c.obj.pos.x - c.pos.x), -(c.obj.pos.z - c.pos.z)) - c.yaw - c.torre.rotation.y; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
        c.torre.rotation.y += clamp(dy, -dt * 1.2, dt * 1.2);
        const d = dist2D(c.obj.pos, c.pos);
        if (c.t <= 0 && Math.abs(dy) < 0.08 && d < 230 && d > 18 && dist2D(c.obj.pos, P.pos) > 18 && !G.sold.some(s => s.team === 'L' && !s.muerto && dist2D(s.pos, c.obj.pos) < 14)) {
          c.t = rnd(5, 8);
          c.g.updateMatrixWorld(true); const b = c.boca.clone().applyMatrix4(c.cuna.matrixWorld);
          const fin = new V3(c.obj.pos.x + rnd(-5, 5), 0, c.obj.pos.z + rnd(-5, 5)); fin.y = H(fin.x, fin.z) + 0.3;
          const dir = fin.clone().sub(b), L = dir.length(); dir.divideScalar(L);
          Snd.explosion(dist2D(c.pos, P.pos) * 0.6, panDe(c.pos)); particula(b, 0xffe2a0, 3, 0.14, 1.5, 0, true); for (let i = 0; i < 4; i++) particula(b.clone().addScaledVector(dir, rnd(0.5, 3)), 0xb9ab95, rnd(1.5, 3), rnd(1.2, 2), 2, 0.6);
          const m = new THREE.Mesh(geoTraza, matTraza); m.scale.set(4, 4, 3); m.position.copy(b); m.lookAt(fin); scene.add(m);
          G.proy.push({ tipo: 'obus', m, v: dir.multiplyScalar(260), t: L / 260, fin, jug: false });
          c.obj = null;
        } else if (c.t < -6) c.obj = null;
      }
    }
  }
  function canonazo() {
    const C = G.carro; if (!C || C.rec > 0 || P.muerto) return;
    if (C.obuses <= 0) { aviso('No quedan proyectiles: usa la ametralladora', 2); return; }
    C.obuses--; C.rec = 3.4; C.retro = 0.45; G.tiros++;
    cam.updateMatrixWorld(); cam.getWorldPosition(_o); dirCamara(_d, 0.004);
    const r = trazar(_o, _d, 380, 'L'), obj = _o.clone().addScaledVector(_d, r.t);
    C.g.updateMatrixWorld(true); const b = C.boca.clone().applyMatrix4(C.cuna.matrixWorld), dir = obj.clone().sub(b), L = dir.length(); dir.divideScalar(L || 1);
    Snd.disparo('canon', 0, 0); G.temblor = Math.max(G.temblor, 0.8);
    particula(b, 0xffe2a0, 3.2, 0.14, 1.5, 0, true); for (let i = 0; i < 5; i++) particula(b.clone().addScaledVector(dir, rnd(0.5, 3)), 0xb9ab95, rnd(1.5, 3), rnd(1.2, 2.2), 2, 0.6);
    const m = new THREE.Mesh(geoTraza, matTraza); m.scale.set(4, 4, 3); m.position.copy(b); m.lookAt(obj); scene.add(m);
    G.proy.push({ tipo: 'obus', m, v: dir.multiplyScalar(260), t: L / 260, fin: obj, jug: true });
    for (const s of G.sold) if (s.team === 'E' && !s.muerto && dist2D(s.pos, P.pos) < 200) s.alerta = true;
  }
  function armaCarro(dt) {
    const C = G.carro; C.mgT -= dt;
    cam.updateMatrixWorld(); cam.getWorldPosition(_o); _f.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const r0 = trazar(_o, _f, 260, 'L'); G.apuntado = !!r0.s; $('mira').classList.toggle('blanco', G.apuntado);
    if (G.pedido > 0) { G.pedido = 0; canonazo(); }
    const auto = AJ.auto && tactil && G.apuntado && !app.classList.contains('raton');
    if ((G.mgCarro || teclas.Space || auto) && C.mgT <= 0 && !P.muerto) {
      C.mgT = 0.09; C.n++; G.tiros++;
      dirCamara(_d, 0.012); const r = trazar(_o, _d, 280, 'L'); _hit.copy(_o).addScaledVector(_d, r.t);
      C.g.updateMatrixWorld(true); const b = new V3(0.24, 0.02, -0.7).applyMatrix4(C.cuna.matrixWorld);
      Snd.disparo('mg', 0, 0); particula(b, 0xffffff, 0.6, 0.06, 0.5, 0, true);
      if (C.n % 2 === 0) trazadora(b, _hit.clone());
      if (r.s) { G.aciertos++; sangre(_hit, _d, r.cabeza); herir(r.s, 60 * (r.cabeza ? 2 : 1), P.pos, true, r.cabeza); } else if (r.t < 279) polvo(_hit, 1, 0.45);
      for (const s of G.sold) if (s.team === 'E' && !s.muerto && dist2D(s.pos, P.pos) < 140) s.alerta = true;
    }
  }
  // ---------- derribo: el piloto salta, se defiende con la pistola y espera al destacamento ----------
  function derriboCaza(texto) {
    const C = G.caza; if (!C) return; G.caza = null; Snd.motor(-1);
    const suelo = H(C.pos.x, C.pos.z), fw = new V3(-Math.sin(C.yaw) * Math.cos(C.pitch), -0.35, -Math.cos(C.yaw) * Math.cos(C.pitch));
    G.restos = { m: C.m, v: fw.multiplyScalar(Math.max(45, C.v)), giro: rnd(-2, 2), humoT: 0 }; C.m.userData.tren.visible = false;
    for (let i = 0; i < 5; i++) particula(C.pos.clone().add(new V3(rnd(-2, 2), rnd(-1, 1), rnd(-2, 2))), i < 2 ? 0xff8a28 : 0x1c1c1c, rnd(3, 5), rnd(0.6, 1.5), 1.6, 1, i < 2);
    // el piloto, colgado del paracaídas, solo con la pistola
    modelos.forEach(m => vm.remove(m.g));
    ARMAS = [Object.assign({ id: 'astra' }, Progreso.ARMAS.astra, { mun: Progreso.ARMAS.astra.carg, res: 64 })];
    modelos = [modeloArma('astra')]; modelos[0].g.visible = false; vm.add(modelos[0].g); construyeBrazos(modelos[0].izq, Progreso.P.equipo.tat);
    Object.assign(P, { arma: 0, vida: 75, muerto: false, curas: 2, granadas: 2, mira: false, agach: false, pitch: -0.3, retroceso: 0 });
    P.pos.set(clamp(C.pos.x, -140, 140), Math.max(C.pos.y, suelo + 75), clamp(C.pos.z, -245, 250)); G.finT = 0; G.recT = 0; G.cool = 0.5;
    const cam2 = paracaidas(0xd9d2b8); scene.add(cam2);
    G.salto = { fase: 'campana', t: 0, avion: { parent: null, userData: {}, position: new V3() }, vel: new V3(-Math.sin(C.yaw) * 6, -8, -Math.cos(C.yaw) * 6), nAli: 0, campana: cam2 };
    ['bAgach', 'bArma', 'bGran', 'bRec', 'bCura', 'bMira', 'bViva'].forEach(id => $(id).style.visibility = ''); $('bFuego').textContent = 'FUEGO'; $('fuego2').textContent = 'FUEGO'; $('mira').style.transform = '';
    G.fase = { tipo: 'rescate', x: P.pos.x, z: P.pos.z, nom: 'Aguanta hasta que llegue el destacamento' }; G.rescate = { t: 55, oleada: 9, llego: false }; G.obj2 = '';
    for (const s of G.sold) if (s.team === 'E' && !s.muerto) { s.aa = false; }
    cartel('¡DERRIBADO!'); aviso(texto + '. Guía la campana y defiéndete con la pistola', 5.5); voz('a_mi', null, 1);
  }
  function actualizaRescate(dt) {
    const R = G.rescate, f = G.fase, enTierra = G.salto && G.salto.fase === 'suelo';
    if (G.restos) { const r = G.restos; r.v.y -= 9.8 * dt; r.m.position.addScaledVector(r.v, dt); r.m.rotation.z += r.giro * dt; r.m.rotation.x -= dt * 0.25; r.humoT -= dt; if (r.humoT <= 0) { r.humoT = 0.06; particula(r.m.position.clone(), 0x1c1c1c, rnd(2.5, 4), rnd(1.5, 2.5), 2, 0.6); }
      if (r.m.position.y < H(r.m.position.x, r.m.position.z) + 1) { explosionFx(r.m.position); explosionGrande(r.m.position.clone()); Snd.explosion(dist2D(r.m.position, P.pos), panDe(r.m.position)); scene.remove(r.m); G.restos = null; } }
    if (!R || !f || f.tipo !== 'rescate') return;
    f.x = P.pos.x; f.z = P.pos.z;
    if (!enTierra) { G.obj2 = 'Baja lejos del enemigo'; return; }
    if (!R.llego) {
      R.t -= dt; R.oleada -= dt;
      if (R.oleada <= 0) { // partidas que vienen a por el piloto
        R.oleada = 11; const vivos = G.sold.filter(s => s.team === 'E' && !s.muerto);
        vivos.sort((a, b) => dist2D(a.pos, P.pos) - dist2D(b.pos, P.pos)).slice(0, 3).forEach(s => { s.estado = 'avanza'; s.alerta = true; s.fase = G.faseI; s.dest = { x: P.pos.x + rnd(-14, 14), z: P.pos.z + rnd(-14, 14) }; s.vel = 3.4; s.t = rnd(4, 7); });
        if (vivos.length < 3) for (let k = 0; k < 3; k++) { const a = rnd(0, 6.28), s = crearSoldado('E', clamp(P.pos.x + Math.cos(a) * 85, -145, 145), clamp(P.pos.z + Math.sin(a) * 85, -250, 255), k + G.sold.length, { fase: G.faseI, estado: 'avanza', alerta: true, dest: { x: P.pos.x + rnd(-12, 12), z: P.pos.z + rnd(-12, 12) }, vel: 3.4, t: rnd(4, 7) }); s.yaw = 0; }
      }
      const mm = Math.max(0, Math.ceil(R.t)); G.obj2 = 'El destacamento llega en 0:' + String(mm).padStart(2, '0') + ' · busca cobertura';
      if (R.t <= 0) { // llega la sección de la Legión
        R.llego = true; const a = Math.atan2(G.m.inicio[0] - P.pos.x, G.m.inicio[1] - P.pos.z);
        for (let k = 0; k < 6; k++) { const x = clamp(P.pos.x + Math.sin(a) * 55 + (k - 2.5) * 3.5, -148, 148), z = clamp(P.pos.z + Math.cos(a) * 55 + (k % 2) * 3, -252, 258); const s = crearSoldado('L', x, z, k, { hueco: k, cad: rnd(2, 3), nombre: NOMBRES[k % NOMBRES.length] }); if (k === 1) s.tipoArma = 'fao'; }
        Snd.corneta('ataque'); voz('viva_legion_b', '¡VIVA LA LEGIÓN!', 1, 0); aviso('¡Llega el destacamento! Aguanta, que ya están aquí', 4);
      }
    } else {
      G.obj2 = 'El destacamento viene a por ti';
      if (G.sold.some(s => s.team === 'L' && !s.muerto && dist2D(s.pos, P.pos) < 9) && !G.fin) { G.fase = null; G.rescatado = true; aviso('Rescatado. Vuelves a casa por tierra', 4); victoria(); }
    }
  }
  // ---------- caza Buchón: despegue, ataque a tierra y toma ----------
  const _fw = new V3(), _ap = new V3();
  function sueloCaza(x, z) { return H(x, z); }
  function actualizaCaza(dt) {
    const C = G.caza, pista = G.m.pista, py = World.refs.pistaY + 1.93;
    (C.m.userData.helices || []).forEach(h => h.rotation.z += dt * (C.gasT <= 0 ? 42 : 14));
    let mx = mov.x, my = mov.y;
    if (teclas.KeyA) mx -= 1; if (teclas.KeyD) mx += 1; if (teclas.KeyS) my += 1; if (teclas.KeyW) my -= 1;
    const sube = clamp(AJ.invVuelo ? my : -my, -1, 1); // >0 = morro arriba
    const dYaw = P.yaw - C.lastYaw, dPit = P.pitch - C.lastPitch; // lo que se arrastra en la mitad derecha también pilota
    if (P.muerto) { // tocado: cae en barrena
      if (!C.caido) { C.pitch += (-0.7 - C.pitch) * Math.min(1, dt); C.roll += dt * 1.6; C.v = Math.min(80, C.v + dt * 8); }
    } else if (C.aterrizando) { // toma automática: alinea, posa y frena
      C.yaw += (0 - C.yaw) * Math.min(1, dt * 2); C.roll += (0 - C.roll) * Math.min(1, dt * 3); C.pitch += ((C.pos.y > py + 0.3 ? -0.09 : 0) - C.pitch) * Math.min(1, dt * 2.5);
      C.pos.x += (pista.x - C.pos.x) * Math.min(1, dt * 1.2); C.pos.y = Math.max(py, C.pos.y - dt * Math.max(4, (C.pos.y - py) * 0.9));
      if (C.pos.y <= py + 0.05) C.v = Math.max(0, C.v - dt * 13); else C.v += (48 - C.v) * Math.min(1, dt);
      C.pos.z -= C.v * dt;
      if (C.v < 2 && !C.parado) { C.parado = true; C.gasT = 99; if (G.fase && G.fase.tipo === 'aterriza') faseCumplida('Has tomado tierra. ¡Buen trabajo!'); }
    } else if (C.suelo) { // carrera de despegue
      C.gasT -= dt; if (C.gasT > 0 && (disparando || G.pedido > 0 || Math.abs(my) > 0.3)) C.gasT = 0;
      if (C.gasT <= 0) { if (!C.rodando) { C.rodando = true; aviso('¡Motor a fondo! El avión despega solo al coger velocidad', 4); } C.v = Math.min(60, C.v + 8 * dt); }
      C.pos.z -= C.v * dt; C.pos.y = py;
      if (C.v > 46 || (C.v > 40 && (sube > 0.25 || dPit > 0.004)) || C.pos.z < pista.z1 + 30) { C.suelo = false; C.pitch = 0.2; C.subeT = 4.5; $('bFuego').textContent = 'CAÑÓN'; aviso('¡En el aire! Joystick ' + (AJ.invVuelo ? 'abajo' : 'arriba') + ' = subir, a los lados = girar', 6); setTimeout(() => { if (G && G.caza === C && !C.aterrizando) C.m.userData.tren.visible = false; }, 2200); }
    } else {
      C.roll += (clamp(mx, -1, 1) * 1.1 - C.roll) * Math.min(1, dt * 3.2);
      C.yaw += dYaw - Math.tan(C.roll) * 9.8 / Math.max(42, C.v) * dt * 1.7;
      C.pitch = clamp(C.pitch + sube * 0.85 * dt + dPit, -0.85, 0.75);
      // ayudas: tras despegar sube solo unos segundos, y cerca del suelo el avión tiende a levantar el morro
      if (C.subeT > 0) { C.subeT -= dt; C.pitch = Math.max(C.pitch, 0.14); }
      { const a0 = C.pos.y - sueloCaza(C.pos.x, C.pos.z); if (a0 < 22 && C.pitch < 0.06 && !(G.fase && G.fase.tipo === 'aterriza')) C.pitch += (0.1 - C.pitch) * Math.min(1, dt * (a0 < 10 ? 4 : 1.6)); }
      C.v += (62 - Math.sin(C.pitch) * 26 - C.v) * Math.min(1, dt * 0.8);
      const alt = C.pos.y - sueloCaza(C.pos.x, C.pos.z);
      if (alt > 220) C.pitch += (-0.08 - C.pitch) * Math.min(1, dt * 1.5); // techo de la misión
      if (Math.hypot(C.pos.x, C.pos.z) > 400) { // se sale de la zona: el avión vira solo hacia el combate
        let d = Math.atan2(C.pos.x, C.pos.z) - C.yaw; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283;
        C.yaw += clamp(d, -dt * 1.0, dt * 1.0); C.roll += (clamp(-d, -1, 1) * 0.9 - C.roll) * Math.min(1, dt * 2);
        C.avisoT -= dt; if (C.avisoT <= 0) { C.avisoT = 5; aviso('Virando de vuelta a la zona de combate', 2.5); }
      }
      // toma de tierra: basta con llegar bajo y enfilado a la cabecera
      if (G.fase && G.fase.tipo === 'aterriza' && Math.abs(C.pos.x - pista.x) < 45 && C.pos.z < pista.z0 + 150 && C.pos.z > pista.z1 + 60 && C.pos.y - py < 48 && Math.cos(C.yaw) > 0.55) { C.aterrizando = true; C.m.userData.tren.visible = true; aviso('Tren fuera: tomando tierra', 3); }
    }
    if (!C.suelo || P.muerto) {
      _fw.set(-Math.sin(C.yaw) * Math.cos(C.pitch), Math.sin(C.pitch), -Math.cos(C.yaw) * Math.cos(C.pitch));
      if (!C.aterrizando && !C.caido) C.pos.addScaledVector(_fw, C.v * dt);
      if (!C.aterrizando && !C.caido && C.pos.y < sueloCaza(C.pos.x, C.pos.z) + 1.3) { // contra el suelo
        C.caido = true; C.m.visible = false; explosionFx(C.pos); explosionGrande(C.pos.clone()); Snd.explosion(0, 0); G.temblor = 1;
        if (!P.muerto) { P.vida = 0; P.muerto = true; G.finT = 2.8; aviso('Te has estrellado', 4); }
      }
    }
    // armas: se tira al punto que marca la cruz
    C.cT -= dt;
    if (!C.suelo && !C.aterrizando && !P.muerto) {
      const apunta = () => { cam.updateMatrixWorld(); cam.getWorldPosition(_o); _f.set(0, 0, -1).applyQuaternion(cam.quaternion); const r = trazar(_o, _f, 650, 'L'); _ap.copy(_o).addScaledVector(_f, r.t); return r; };
      if (disparando && C.cT <= 0) {
        if (C.mun <= 0) { C.cT = 0.6; Snd.clic(); } else {
          C.cT = 0.075; C.mun--; C.n++; G.tiros++; apunta();
          const b = C.pos.clone().add(new V3(Math.cos(C.yaw) * (C.n % 2 ? 2 : -2), -0.2, -Math.sin(C.yaw) * (C.n % 2 ? 2 : -2)));
          _d.copy(_ap).add(new V3(rnd(-2.2, 2.2), rnd(-1, 1), rnd(-2.2, 2.2))).sub(b).normalize();
          const r = trazar(b, _d, 650, 'L'); _hit.copy(b).addScaledVector(_d, r.t);
          Snd.disparo('mg', 0, 0); if (C.n % 2 === 0) trazadora(b, _hit.clone());
          if (r.s) { G.aciertos++; sangre(_hit, _d, true); herir(r.s, 95, P.pos, true, r.cabeza); } else if (r.t < 649) polvo(_hit, 2, 0.8);
          // proyectil explosivo de 20 mm: la metralla alcanza a quien esté junto al impacto
          if (r.t < 649) derrumbes(World.danar(_hit, 0.34, 5));
          if (r.t < 649) for (const s of G.sold) if (s.team !== 'L' && !s.muerto && s !== r.s && s.pos.distanceTo(_hit) < 4) { sangre(new V3(s.pos.x, s.pos.y + 1.1, s.pos.z), null, false); herir(s, 55, P.pos, true); }
        }
      }
      const pide = G.cohetePed || (teclas.Space && !C.spc); C.spc = !!teclas.Space; G.cohetePed = false;
      if (pide) {
        if (C.cohetes <= 0) aviso('No quedan cohetes', 1.5); else {
          C.cohetes--; G.tiros++; apunta(); const fin = _ap.clone(), lado = C.cohetes % 2 ? 3 : -3;
          const b = C.pos.clone().add(new V3(Math.cos(C.yaw) * lado, -0.4, -Math.sin(C.yaw) * lado)), dir = fin.clone().sub(b), L = dir.length(); dir.divideScalar(L || 1);
          const q = C.m.children.find(x => x.name === 'cohete' && x.visible); if (q) q.visible = false;
          const m = new THREE.Mesh(geoTraza, matTraza); m.scale.set(5, 5, 2.5); m.position.copy(b); m.lookAt(fin); scene.add(m);
          G.proy.push({ tipo: 'obus', m, v: dir.multiplyScalar(190), t: L / 190, fin, jug: true });
          Snd.disparo('mauser', 0, 0); Snd.silbido(0); for (let i = 0; i < 4; i++) particula(b.clone().addScaledVector(dir, -i * 0.004), 0xe8e0d0, rnd(1, 2), rnd(0.8, 1.6), 2, 0.3);
          aviso(C.cohetes + ' cohetes', 1);
        }
      }
    } else G.cohetePed = false;
    if (!C.suelo && !C.aterrizando && !P.muerto && C.mun <= 0 && C.cohetes <= 0 && G.fase && G.fase.tipo === 'take') {
      if (C.sinT == null) { C.sinT = 7; aviso('Sin munición: última pasada rasante para marcar la posición', 4); }
      C.sinT -= dt; if (C.sinT <= 0) return derriboCaza('Sin munición y a poca altura: te han dado');
    }
    C.m.position.copy(C.pos); C.m.rotation.set(C.pitch, C.yaw, -C.roll, 'YXZ');
    P.pos.set(C.pos.x, C.pos.y - 1.35, C.pos.z); P.yaw = C.lastYaw = C.yaw; P.pitch = C.lastPitch = clamp(C.pitch, -1.2, 1.2); P.mov = 0;
    for (const s of G.sold) if (s.team === 'E' && !s.muerto && !s.alerta && s.pos.distanceTo(C.pos) < 240) s.alerta = true;
    Snd.motor(C.caido || C.parado ? -1 : Math.min(1, 0.35 + C.v / 95));
  }
  function actualizaJugador(dt) {
    if (G.caza) return actualizaCaza(dt);
    if (G.carro) return actualizaCarro(dt);
    if (G.salto && G.salto.fase !== 'suelo') { actualizaSalto(dt); if (P.muerto) P.pitch = Math.max(P.pitch - dt * 0.6, -0.5); return; }
    if (G.nido) {
      const f = G.m.fases[0]; P.pos.set(f.x, H(f.x, f.z) + 5.0, f.z); P.mov = 0;
      P.yaw = clamp(P.yaw, -1.25, 1.25); P.pitch = clamp(P.pitch, -0.6, 0.3);
      if (P.muerto) P.pitch = Math.max(P.pitch - dt * 0.6, -0.5);
      return;
    }
    if (P.muerto) { P.pitch = Math.max(P.pitch - dt * 0.6, -0.5); return; }
    let mx = mov.x, my = mov.y;
    if (teclas.KeyW) my -= 1; if (teclas.KeyS) my += 1; if (teclas.KeyA) mx -= 1; if (teclas.KeyD) mx += 1;
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    const vel = P.agach ? 1.8 : P.mira ? 2.3 : 4.3, sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    P.pos.x += (mx * cy + my * sy) * vel * dt; P.pos.z += (-mx * sy + my * cy) * vel * dt;
    World.colisiona(P.pos, 0.4);
    P.pos.x = clamp(P.pos.x, -150, 150); P.pos.z = clamp(P.pos.z, -255, 262); P.pos.y = H(P.pos.x, P.pos.z);
    P.mov = Math.min(1, ml); if (P.mov > 0.1) P.bob += dt * vel * 2.2;
  }
  function recargaNido() {
    const N = G.nido; if (N.rec > 0 || N.mun >= 100) return;
    if (N.cintas <= 0) { aviso('No quedan cintas', 2); return; }
    N.rec = 3.2; Snd.recarga(); if (Math.random() < 0.5) voz('recargando', null, 0.9);
  }
  function tiroNido() {
    const N = G.nido;
    N.mun--; N.n++; G.cool = 0.08; N.calor += 1.7; G.tiros++;
    if (N.calor >= 100) { N.calor = 100; N.bloqueo = true; aviso('¡Cañón al rojo! Espera a que se enfríe', 2.5); }
    Snd.disparo('mg', 0, 0);
    fogonazo.visible = true; fogonazo.material.rotation = Math.random() * 6; luzDisparo.intensity = 2.4; G.flashT = 0.04;
    P.retroceso += 0.007; G.temblor = Math.max(G.temblor, 0.12);
    cam.updateMatrixWorld(); dirCamara(_d, P.mira ? 0.006 : 0.014); cam.getWorldPosition(_o);
    const r = trazar(_o, _d, 300, 'L');
    _hit.copy(_o).addScaledVector(_d, r.t);
    if (N.n % 3 === 0) { const b = new V3(); fogonazo.getWorldPosition(b); trazadora(b, _hit.clone()); }
    if (r.s) { G.aciertos++; sangre(_hit, _d, true); herir(r.s, 75 * (r.cabeza ? 2 : 1), P.pos, true, r.cabeza); }
    else if (r.t < 299) polvo(_hit, 2, 0.5);
    if (N.mun <= 0) recargaNido();
  }
  function armaNido(dt) {
    const N = G.nido;
    G.cool -= dt;
    if (N.rec > 0) { N.rec -= dt; if (N.rec <= 0) { N.rec = 0; N.cintas--; N.mun = 100; } }
    if (N.bloqueo && N.calor < 35) { N.bloqueo = false; aviso('Cañón frío: ¡fuego!', 1.5); }
    N.calor = Math.max(0, N.calor - dt * (disparando ? 5 : 15));
    if (G.pedido > 0) G.pedido -= dt;
    if ((disparando || G.pedido > 0) && G.cool <= 0 && N.rec <= 0 && !N.bloqueo && !P.muerto) { if (N.mun > 0) tiroNido(); G.pedido = 0; }
    if (G.flashT > 0) { G.flashT -= dt; if (G.flashT <= 0) { fogonazo.visible = false; luzDisparo.intensity = 0; } }
  }
  function actualizaArma(dt) {
    if (G.caza) return;
    if (G.cuchT > 0) G.cuchT -= dt;
    if (G.carro) return armaCarro(dt);
    if (G.nido) return armaNido(dt);
    if (G.salto && G.salto.fase !== 'suelo' && G.salto.fase !== 'campana') { if (disparando || G.pedido > 0) { G.pedido = 0; saltar(); } return; }
    const a = ARMAS[P.arma];
    G.cool -= dt;
    if (G.recT > 0) { G.recT -= dt; if (G.recT <= 0) { G.recT = 0; terminaRecarga(); } }
    cam.updateMatrixWorld(); cam.getWorldPosition(_o); _f.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const r = trazar(_o, _f, 220, 'L'); G.apuntado = !!r.s;
    $('mira').classList.toggle('blanco', G.apuntado);
    const auto = AJ.auto && tactil && G.apuntado && !app.classList.contains('raton');
    if (G.pedido > 0) G.pedido -= dt;
    const quiere = (disparando && (a.auto || !G.disparoHecho)) || G.pedido > 0 || auto;
    if (quiere && G.cool <= 0 && G.recT <= 0) { dispararJugador(); G.disparoHecho = true; G.pedido = 0; }
    if (!disparando && G.pedido <= 0) G.disparoHecho = false;
    if (G.flashT > 0) { G.flashT -= dt; if (G.flashT <= 0) { fogonazo.visible = false; luzDisparo.intensity = 0; } }
  }
  function actualizaProyectiles(dt) {
    for (let i = G.proy.length - 1; i >= 0; i--) {
      const p = G.proy[i]; p.t -= dt;
      if (p.tipo === 'mortero') { if (p.t <= 0) { G.proy.splice(i, 1); explotar(p.fin, 7.5, 3, false); } continue; }
      if (p.tipo === 'obus') { p.m.position.addScaledVector(p.v, dt); if (p.t <= 0) { scene.remove(p.m); G.proy.splice(i, 1); explotar(p.fin, 11, 5, true); } continue; }
      p.v.y -= 9.8 * dt; p.m.position.addScaledVector(p.v, dt);
      if (p.tipo === 'bomba' && p.estela != null) { p.m.lookAt(_v.copy(p.m.position).add(p.v)); p.estela -= dt; if (p.estela <= 0) { p.estela = 0.05; particula(p.m.position.clone(), 0xffffff, 0.9, 0.5, 1.2, 0); } }
      const h = H(p.m.position.x, p.m.position.z);
      if (p.m.position.y < h + 0.07) { p.m.position.y = h + 0.07; p.v.y = Math.abs(p.v.y) * 0.3; p.v.x *= 0.5; p.v.z *= 0.5; if (p.tipo === 'bomba') p.t = 0; }
      if (p.t <= 0) { scene.remove(p.m); G.proy.splice(i, 1); explotar(p.m.position.clone(), p.tipo === 'bomba' ? 13 : (Progreso.P.extras || {}).defensiva ? 10.5 : 8, p.tipo === 'bomba' ? 6 : (Progreso.P.extras || {}).defensiva ? 4.5 : 3.5, p.jug); }
    }
    const av = G.avion;
    if (av && av.libre) { av.m.position.addScaledVector(av.libre, dt); av.t -= dt; if (av.t <= 0) { scene.remove(av.m); G.avion = null; } }
    else if (av) {
      av.m.position.z -= 62 * dt;
      if (av.soltadas < 4 && av.m.position.z < av.f.z + 40 - av.soltadas * 9) {
        av.soltadas++;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8), World.mat(0x333333)); b.rotation.x = Math.PI / 2;
        b.position.copy(av.m.position).add(new V3(rnd(-6, 6), -1, 0)); scene.add(b);
        G.proy.push({ tipo: 'bomba', m: b, v: new V3(rnd(-3, 3) - 0.6, -2, -48), t: 10, jug: true });
      }
      if (av.m.position.z < av.f.z - 420) { scene.remove(av.m); G.avion = null; }
    }
  }
  function actualizaCamara(dt) {
    if (G.caza) { // cámara tras la cola del caza; la cruz del centro es adonde van los disparos
      const C = G.caza, cp = Math.cos(C.pitch), fx = -Math.sin(C.yaw) * cp, fy = Math.sin(C.pitch), fz = -Math.cos(C.yaw) * cp, d = C.suelo ? 11 : 13;
      cam.position.set(C.pos.x - fx * d, C.pos.y - fy * d + (C.suelo ? 3.1 : 4.8), C.pos.z - fz * d); cam.position.y = Math.max(cam.position.y, sueloCaza(cam.position.x, cam.position.z) + 0.8);
      cam.rotation.set(C.pitch - (C.suelo ? 0.07 : 0.14), C.yaw, -C.roll * 0.5); G.temblor = Math.max(0, G.temblor - dt * 1.5);
      cam.fov += (68 - cam.fov) * Math.min(1, dt * 8); cam.updateProjectionMatrix(); $('visor').hidden = true; $('mira').style.visibility = ''; $('mira').style.transform = 'scale(2.4)';
      modelos.forEach(m => m.g.visible = false); brazos.visible = false; mg.g.visible = false; fogonazo.visible = false;
      const R = World.refs; R.sun.position.copy(C.pos).addScaledVector(R.solDir, 120); R.sun.target.position.copy(C.pos);
      return;
    }
    if (G.vuelo) { $('visor').hidden = true; // cámara de persecución tras el bombardero, mirando al punto de caída
      const V = G.vuelo, sy = Math.sin(V.rumbo), cy = Math.cos(V.rumbo);
      const cayendo = G.proy.some(p => p.tipo === 'bomba'); V.picado = (V.picado || 0) + ((cayendo ? 1 : 0) - (V.picado || 0)) * Math.min(1, dt * 2.5);
      if (V.sigue && G.proy.includes(V.sigue)) { // cada bomba se sigue con la cámara hasta el impacto
        const bp = V.sigue.m.position, vn = _v.copy(V.sigue.v).normalize();
        cam.position.set(bp.x - vn.x * 18, bp.y - vn.y * 18 + 6, bp.z - vn.z * 18); cam.lookAt(bp.x + vn.x * 20, bp.y + vn.y * 20, bp.z + vn.z * 20);
        (V.imp = V.imp || new V3()).copy(bp); V.impT = 2.6; V.impDir = Math.atan2(-vn.x, -vn.z);
      } else if (V.impT > 0) { // y se queda viendo el destrozo, apartándose despacio
        V.impT -= dt; V.vista = true; const k = 2.6 - V.impT, d = 26 + k * 5, sy2 = Math.sin(V.impDir), cy2 = Math.cos(V.impDir);
        cam.position.set(V.imp.x + sy2 * d, H(V.imp.x, V.imp.z) + 13 + k * 2.5, V.imp.z + cy2 * d); cam.lookAt(V.imp.x, H(V.imp.x, V.imp.z) + 3, V.imp.z);
      } else {
        if (V.vista) { // acabado de ver el impacto: nueva pasada si quedan bombas, o se acabó
          V.vista = false;
          if (V.bombas <= 0) { finVuelo(); return actualizaCamara(dt); }
          const f = G.fase || G.m.fases[G.m.fases.length - 1], r = V.rumbo0;
          V.pos.set(f.x + Math.sin(r) * 420, V.pos.y, f.z + Math.cos(r) * 420); V.rumbo = r; P.yaw = r; V.t = 0; V.alabeo = 0;
          aviso('Nueva pasada: quedan ' + V.bombas + ' bombas', 2.5);
        }
        // la cruz del centro de la pantalla es el punto donde caerá la bomba (parábola de caída)
        cam.position.set(V.pos.x + sy * 30, V.pos.y + 20, V.pos.z + cy * 30); cam.lookAt(_imp.x, _imp.y, _imp.z); cam.rotateZ(V.alabeo * 0.3);
      }
      cam.fov += (62 - cam.fov) * Math.min(1, dt * 8); cam.updateProjectionMatrix();
      modelos.forEach(m => m.g.visible = false); brazos.visible = false; mg.g.visible = false; fogonazo.visible = false;
      const R = World.refs; R.sun.position.copy(V.pos).addScaledVector(R.solDir, 120); R.sun.target.position.copy(V.pos);
      return;
    }
    const a = ARMAS[P.arma], md = modelos[P.arma];
    P.retroceso *= Math.pow(0.0005, dt); G.temblor = Math.max(0, G.temblor - dt * 1.5);
    const alt = P.muerto ? 0.35 : (P.agach ? 1.05 : 1.62);
    G.alt = G.alt == null ? alt : G.alt + (alt - G.alt) * Math.min(1, dt * 10);
    const bob = Math.sin(P.bob) * 0.035 * P.mov;
    if (G.carro) {
      C_visor: if (P.mira) { const C = G.carro; C.g.visible = false; C.g.updateMatrixWorld(true); cam.position.set(0, 0.42, -0.9).applyMatrix4(C.cuna.matrixWorld); } else G.carro.g.visible = true;
      const pt = clamp(P.pitch, -0.45, 0.4), cp = Math.cos(pt), d = 7.5;
      if (!P.mira) {
      cam.position.set(P.pos.x + Math.sin(P.yaw) * cp * d, P.pos.y + 4.3 - Math.sin(pt) * d * 0.6, P.pos.z + Math.cos(P.yaw) * cp * d);
      cam.position.y = Math.max(cam.position.y, H(cam.position.x, cam.position.z) + 1); }
    } else
    cam.position.set(P.pos.x, P.pos.y + G.alt + bob, P.pos.z);
    const tb = G.temblor * 0.03;
    const balanceo = G.salto && G.salto.fase === 'campana' ? Math.sin(G.t * 0.9) * 0.05 : G.salto && G.salto.fase === 'caida' ? Math.sin(G.t * 7) * 0.25 : 0;
    cam.rotation.set(clamp(P.pitch + P.retroceso, -1.35, 1.35) + rnd(-tb, tb), P.yaw + rnd(-tb, tb), P.muerto ? 0.6 : balanceo);
    const visor = !!(G.carro && P.mira && !P.muerto); $('visor').hidden = !visor; $('mira').style.visibility = visor ? 'hidden' : '';
    const fov = visor ? 15 : P.mira ? 42 : 72; cam.fov += (fov - cam.fov) * Math.min(1, dt * 12); cam.updateProjectionMatrix();
    const enPuerta = (G.salto && (G.salto.fase === 'puerta' || G.salto.fase === 'caida')) || !!G.carro;
    modelos.forEach((m, i) => m.g.visible = i === P.arma && !P.muerto && !G.nido && !enPuerta); brazos.visible = !P.muerto && !G.nido && !enPuerta; mg.g.visible = !!G.nido && !P.muerto;
    const rec = G.recT > 0 ? Math.sin(Math.min(1, (a.rec - G.recT) / a.rec) * Math.PI) : 0;
    const cambio = G.cambioT > 0 ? (G.cambioT -= dt, G.cambioT / 0.4) : 0;
    const tx = G.nido ? 0 : P.mira ? 0 : 0.22, ty = (G.nido ? (P.mira ? -0.17 : -0.27) : P.mira ? -0.085 : -0.22) - rec * 0.25 - cambio * 0.3 + Math.sin(P.bob * 0.5) * 0.01 * P.mov, tz = G.nido ? -0.5 : P.mira ? -0.27 : -0.42;
    vm.position.x += (tx - vm.position.x) * Math.min(1, dt * 14); vm.position.y += (ty - vm.position.y) * Math.min(1, dt * 14); vm.position.z += (tz + P.retroceso * 0.8 - (G.estocada > 0 ? (G.estocada -= dt, Math.sin(Math.max(0, G.estocada) / 0.28 * Math.PI) * 0.3) : 0) - vm.position.z) * Math.min(1, dt * 20);
    vm.rotation.set(rec * 0.6 + P.retroceso * 2, P.mira ? 0 : 0.04, rec * 0.4);
    if (G.carro) fogonazo.visible = false;
    if (G.nido) fogonazo.position.set(0, 0.01, mg.muzz); else fogonazo.position.set(0, 0.03, md.muzz);
    const R = World.refs; R.sun.position.copy(P.pos).addScaledVector(R.solDir, 120); R.sun.target.position.copy(P.pos);
    if (R.bandera) { const p = R.bandera.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 1.2; p.setZ(i, Math.sin(x * 2.4 - G.t * 6) * 0.12 * x); } p.needsUpdate = true; }
    if (G.m.noche) {
      G.flareT -= dt;
      if (G.flareT <= 0) { G.flareT = rnd(16, 24); const f = G.fase || G.m.fases[0]; R.flare.position.set(f.x + rnd(-30, 30), H(f.x, f.z) + 75, f.z + rnd(-20, 30)); G.flareVida = 14; }
      if (G.flareVida > 0) { G.flareVida -= dt; R.flare.position.y -= dt * 3.2; R.flare.intensity = (G.flareVida > 1 ? 2.2 : G.flareVida * 2.2) * (0.85 + Math.random() * 0.15); } else R.flare.intensity = 0;
    }
  }
  // marcas de enemigos: flecha roja sobre los que combaten y flechas en el borde para los que están fuera de la vista
  const capaMarcas = $('marcas'), marcas = [], _m = new V3();
  function marcaN(i) {
    while (marcas.length <= i) { const e = document.createElement('div'); e.className = 'mken'; e.innerHTML = '<i></i><small></small>'; capaMarcas.appendChild(e); marcas.push(e); }
    return marcas[i];
  }
  function actualizaMarcas() {
    const w = capaMarcas.clientWidth || innerWidth, h = capaMarcas.clientHeight || innerHeight;
    const lista = G.sold.filter(s => s.team === 'E' && !s.muerto && s.estado !== 'huye' && (s.alerta || (s.ultimoTiro && G.t - s.ultimoTiro < 4)))
      .map(s => ({ s, d: dist2D(s.pos, P.pos) })).filter(o => o.d < (G.caza ? 520 : 170)).sort((a, b) => a.d - b.d).slice(0, 10)
      .concat(G.caza && G.fase && G.fase.tipo === 'take' ? World.blancosDe(G.fase).map(e => ({ s: { pos: { x: e.x, y: H(e.x, e.z) + 3.5, z: e.z }, blanco: true, agach: true }, d: Math.hypot(e.x - P.pos.x, e.z - P.pos.z) })) : [])
      .concat(G.sold.filter(s => s.herido > 0 || (s.civil && !s.muerto)).map(s => ({ s, d: dist2D(s.pos, P.pos) })).filter(o => !o.s.civil || o.d < 70));
    let i = 0;
    for (const { s, d } of lista) {
      _m.set(s.pos.x, s.pos.y + (s.herido > 0 ? 1.2 : s.agach ? 1.5 : 2.05), s.pos.z).project(cam);
      const detras = _m.z > 1; let x = _m.x, y = _m.y; if (detras) { x = -x; y = -y; }
      const dentro = !detras && Math.abs(x) < 0.94 && Math.abs(y) < 0.9;
      const e = marcaN(i++); e.hidden = false; e.classList.toggle('borde', !dentro); e.classList.toggle('tira', !!(s.ultimoTiro && G.t - s.ultimoTiro < 0.4)); e.classList.toggle('jefe', !!s.jefe); e.classList.toggle('herido', s.herido > 0); e.classList.toggle('civil', !!s.civil); e.classList.toggle('blanco', !!s.blanco);
      if (dentro) { e.style.left = ((x + 1) / 2 * w) + 'px'; e.style.top = ((1 - y) / 2 * h) + 'px'; e.style.transform = ''; e.lastChild.textContent = s.blanco ? 'BLANCO · ' + Math.round(d) + ' m' : s.civil ? 'CIVIL' : s.herido > 0 ? '✚ ' + Math.ceil(s.herido) + ' s' : s.jefe ? 'JEFE · ' + Math.round(d) + ' m' : Math.round(d) + ' m'; }
      else {
        const a = Math.atan2(y, x), k = Math.min(0.9 / Math.abs(Math.cos(a) || 1e-6), 0.82 / Math.abs(Math.sin(a) || 1e-6));
        e.style.left = ((Math.cos(a) * k + 1) / 2 * w) + 'px'; e.style.top = ((1 - Math.sin(a) * k) / 2 * h) + 'px';
        e.style.transform = 'rotate(' + (-a) + 'rad)'; e.lastChild.textContent = '';
      }
    }
    for (; i < marcas.length; i++) marcas[i].hidden = true;
  }

  function actualizaHUD(dt) {
    actualizaMarcas();
    const a = ARMAS[P.arma];
    $('tVida').textContent = Math.ceil(P.vida); $('vida').firstElementChild.style.width = P.vida + '%';
    $('tCuras').textContent = P.curas; $('tBajas').textContent = G.bajas;
    $('tEsc').textContent = G.sold.filter(s => s.team === 'L' && !s.muerto).length;
    if (G.caza) { const C = G.caza; $('tMun').textContent = C.mun; $('tRes').textContent = C.cohetes + ' cohetes'; $('tArma').textContent = 'Buchón · ' + Math.round(C.v * 3.6) + ' km/h · ' + Math.max(0, Math.round(C.pos.y - sueloCaza(C.pos.x, C.pos.z))) + ' m'; $('tArma').style.color = ''; }
    else if (G.vuelo) { $('tMun').textContent = G.vuelo.bombas; $('tRes').textContent = 'bombas'; $('tArma').textContent = 'Heinkel CASA 2.111'; $('tArma').style.color = ''; }
    else if (G.carro) { const C = G.carro; $('tMun').textContent = C.rec > 0 ? '··' : 'LISTO'; $('tRes').textContent = C.obuses + ' proyectiles'; $('tArma').textContent = 'M-24 Chaffee · cañón de 75 mm'; $('tArma').style.color = ''; }
    else if (G.nido) { const N = G.nido; $('tMun').textContent = N.rec > 0 ? '··' : N.mun; $('tRes').textContent = N.cintas + ' cintas'; $('tArma').textContent = 'ALFA mod. 44 · calor ' + Math.round(N.calor) + ' %'; $('tArma').style.color = N.bloqueo ? '#ff5a4a' : N.calor > 70 ? '#ffb347' : ''; }
    else { $('tMun').textContent = G.recT > 0 ? '··' : a.mun; $('tRes').textContent = a.res; $('tArma').textContent = a.nom; $('tArma').style.color = ''; }
    $('tGran').textContent = P.granadas;
    $('bGran').classList.toggle('agotado', P.granadas <= 0); $('bCura').classList.toggle('agotado', P.curas <= 0); if (G.hudG !== P.granadas) { G.hudG = P.granadas; $('bGran').innerHTML = 'GRANADA<br>' + P.granadas; } if (G.hudC !== P.curas) { G.hudC = P.curas; $('bCura').innerHTML = 'CURA<br>' + P.curas; } $('bAvion').disabled = P.avion <= 0; $('bAvion').hidden = !(G.m.avion > 0);
    $('bViva').disabled = G.vivaCD > 0; $('bViva').textContent = G.vivaCD > 0 ? Math.ceil(G.vivaCD) + 's' : '¡VIVA!';
    { const cerca = !G.carro && !G.nido && !G.vuelo && !P.muerto && !(G.salto && G.salto.fase !== 'suelo') && !!enemigoAMano(); if ($('bCuch').hidden === cerca) $('bCuch').hidden = !cerca; }
    $('bAgach').classList.toggle('on', P.agach); $('bMira').classList.toggle('on', P.mira);
    const f = G.fase;
    if (f) {
      const dx = f.x - P.pos.x, dz = f.z - P.pos.z, d = Math.hypot(dx, dz);
      $('tObj').textContent = f.tipo === 'nido' || f.tipo === 'tiradores' || f.tipo === 'carga' ? f.nom : f.nom + ' · ' + Math.round(d) + ' m'; $('tObj2').textContent = (G.obj2 || '') + (G.camiones ? ' · convoy ' + Math.ceil(G.convoy) + ' %' : '');
      $('flecha').style.transform = 'rotate(' + (-(Math.atan2(-dx, -dz) - P.yaw)) + 'rad)';
      G.marca.visible = d > 12 && f.tipo !== 'tiradores' && f.tipo !== 'carga'; G.marca.position.set(f.x, H(f.x, f.z) + 7, f.z);
    } else G.marca.visible = false;
    const dano = $('dano'); let op = Math.max(0, (parseFloat(dano.style.opacity) || 0) - dt * 0.9);
    if (P.vida < 30 && !P.muerto) op = Math.max(op, 0.25 + Math.sin(G.t * 4) * 0.1);
    dano.style.opacity = op;
    if (G.dirT > 0) { G.dirT -= dt; $('dir').style.opacity = Math.max(0, G.dirT); }
    if (avisoT > 0) { avisoT -= dt; if (avisoT <= 0) $('aviso').style.opacity = 0; }
  }

  let ultimo = performance.now(), menuT = 0;
  function bucle(ahora) {
    requestAnimationFrame(bucle);
    const dt = Math.min(0.05, (ahora - ultimo) / 1000); const ultimoReal = ultimo; ultimo = ahora;
    if (jugando && !pausado && G) {
      G.t += dt; gritoT -= dt; G.viva = Math.max(0, G.viva - dt); G.vivaCD = Math.max(0, G.vivaCD - dt);
      if (G.vuelo) actualizaVuelo(dt); else { actualizaJugador(dt); actualizaArma(dt); }
      for (const s of G.sold) actualizaSoldado(s, dt);
      actualizaBotin(dt); actualizaProyectiles(dt); actualizaFase(dt); if (G.rescate || G.restos) actualizaRescate(dt); if (G.camiones) actualizaConvoy(dt); actualizaEfectos(dt); actualizaSangre(dt);
      const combate = G.sold.some(s => s.team === 'E' && !s.muerto && s.alerta);
      G.gritoBat -= dt;
      if (combate && G.gritoBat <= 0) { G.gritoBat = rnd(11, 19); gritoAliado(); }
      if (G.finT > 0) { G.finT -= dt; if (G.finT <= 0) ofrecerRevivir(); }
      actualizaCamara(dt); actualizaHUD(dt);
      // calidad automática: si en los primeros segundos no llega a 28 fps, pasa a modo rendimiento
      if (AJ.calAuto && AJ.calidad === 'alta' && G.t > 2 && G.t < 8) { G.fpsN = (G.fpsN || 0) + 1; G.fpsT = (G.fpsT || 0) + (ahora - ultimoReal) / 1000; if (G.fpsN > 90 && G.fpsN / G.fpsT < 28) { AJ.calidad = 'baja'; AJ.calAuto = false; guardarAJ(); aplicaCalidad(); redim(); aviso('Gráficos en modo rendimiento para que vaya fluido', 3); } }
    } else if (!jugando) {
      menuT += dt * 0.04; const r = 70;
      cam.position.set(Math.sin(menuT) * r, H(Math.sin(menuT) * r, Math.cos(menuT) * r + 40) + 22, Math.cos(menuT) * r + 40);
      cam.rotation.set(-0.18, menuT + Math.PI, 0); cam.fov = 60; cam.updateProjectionMatrix();
    }
    vm.visible = jugando;
    renderer.render(scene, cam);
  }

  // ---------- menús ----------
  function abrirParte(i) {
    G_camp = null; Snd.narrar(null);
    Snd.init(); misionIdx = i; const m = MISIONES[i];
    $('pDato').textContent = m.dato; $('pTit').textContent = m.tit;
    $('pTxt').innerHTML = m.parte.map(p => '<p>' + p + '</p>').join('') + (G_diaria && G_diaria.idx === i ? '<p><b>Orden del día:</b> cúmplela ' + G_diaria.mod.t + '. Premio: ' + G_diaria.premio + '.</p>' : '') + '<p class="nota"><b>Méritos (₧ 100 cada uno):</b> ' + meritos(m).map(x => x.t).join(' · ') + '</p>';
    $('menu').hidden = true; $('parte').hidden = false; Snd.musica(true);
  }
  function alMenu() {
    jugando = false; pausado = true; G = null; G_camp = null; Snd.narrar(null); Snd.motor(-1); $('etapa').hidden = true;
    ['hud', 'mandos', 'parte', 'fin', 'pausa', 'ajustes', 'revivir'].forEach(id => $(id).hidden = true);
    construir(MISIONES.find(m => m.id === 'tiliuin')); if (Snd.listo) Snd.musica(true); UI.tab('campana'); $('menu').hidden = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function pausar(v) {
    if (!jugando) return; pausado = v; $('pausa').hidden = !v; $('mandos').hidden = v; if (v) Snd.motor(-1);
    disparando = false; mov.x = mov.y = 0; toques.clear(); $('palanca').hidden = true;
    if (v && document.pointerLockElement) document.exitPointerLock();
  }
  let ajDesde = 'menu';
  function abrirAjustes(desde) {
    ajDesde = desde; $(desde).hidden = true; $('ajustes').hidden = false;
    $('aDiag').textContent = Nativo.anuncios ? 'Anuncios de Google: ' + (Nativo.ultimoError ? 'último aviso → ' + Nativo.ultimoError : 'sin errores') + (Nativo.CONFIG.pruebas ? ' · modo de prueba' : '') : 'Anuncios y compras simulados (versión web)';
    $('aSens').value = AJ.sens; $('aVol').value = AJ.vol; $('aAuto').checked = AJ.auto; $('aInv').checked = AJ.invVuelo; $('aZurdo').checked = AJ.zurdo; $('aDif').value = String(AJ.dif); $('aCal').value = AJ.calidad;
  }
  $('aSens').oninput = e => AJ.sens = +e.target.value;
  $('aVol').oninput = e => { AJ.vol = +e.target.value; Snd.setVol(AJ.vol); };
  $('aAuto').onchange = e => AJ.auto = e.target.checked;
  $('aInv').onchange = e => AJ.invVuelo = e.target.checked;
  $('aZurdo').onchange = e => { AJ.zurdo = e.target.checked; app.classList.toggle('zurdo', AJ.zurdo); };
  $('aDif').onchange = e => AJ.dif = +e.target.value;
  $('aCal').onchange = e => { AJ.calidad = e.target.value; AJ.calAuto = false; aplicaCalidad(); redim(); };
  // el himno suena desde que se entra al menú y se calla al empezar el combate
  $('bEntrar').addEventListener('click', () => { Snd.init(); Snd.setVol(AJ.vol); Snd.musica(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) Snd.musica(false); else if (!jugando && Snd.listo && $('portada').hidden) Snd.musica(true); });
  $('bAjOk').onclick = () => { guardarAJ(); $('ajustes').hidden = true; $(ajDesde).hidden = false; };
  $('bAjustes').onclick = () => abrirAjustes('menu');
  $('bAj2').onclick = () => abrirAjustes('pausa');
  $('bCombate').onclick = () => { Snd.init(); Snd.setVol(AJ.vol); Snd.musica(false); $('parte').hidden = true; empezar(misionIdx); };
  $('bVolver').onclick = () => { G_diaria = null; G_camp = null; Snd.narrar(null); $('parte').hidden = true; $('menu').hidden = false; };
  $('bSig').onclick = () => { $('fin').hidden = true; abrirParte(misionIdx + 1); };
  $('bRep').onclick = () => { $('fin').hidden = true; empezar(misionIdx); };
  $('bMenu').onclick = alMenu;
  $('bSeguir').onclick = () => pausar(false);
  $('bSalir').onclick = alMenu;

  // ---------- mandos táctiles ----------
  const capa = $('mandos'), pal = $('palanca'), palI = pal.firstElementChild;
  const toques = new Map();
  function mirar(dx, dy, k) { const f = (k || 0.0048) * AJ.sens * (P.mira ? 0.45 : 1); P.yaw -= dx * f; P.pitch = clamp(P.pitch - dy * f, -1.25, 1.25); }
  capa.addEventListener('pointerdown', e => {
    if (e.target.closest('.bt')) return;
    Snd.init();
    if (e.pointerType === 'mouse') {
      app.classList.add('raton');
      if (!document.pointerLockElement && capa.requestPointerLock) { try { const r = capa.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (er) {} }
      if (e.button === 0) { disparando = true; if (G) G.pedido = 0.3; } else if (e.button === 2) P.mira = true;
      toques.set(e.pointerId, { rol: 'raton', x: e.clientX, y: e.clientY });
      return;
    }
    const izq = AJ.zurdo ? e.clientX > innerWidth * 0.55 : e.clientX < innerWidth * 0.45;
    if (izq && ![...toques.values()].some(t => t.rol === 'mover')) {
      toques.set(e.pointerId, { rol: 'mover', x0: e.clientX, y0: e.clientY });
      pal.hidden = false; pal.style.left = e.clientX + 'px'; pal.style.top = e.clientY + 'px'; palI.style.transform = '';
    } else toques.set(e.pointerId, { rol: 'mirar', x: e.clientX, y: e.clientY });
  });
  addEventListener('pointermove', e => {
    const t = toques.get(e.pointerId); if (!t) return;
    if (t.rol === 'mover') {
      let dx = (e.clientX - t.x0) / 50, dy = (e.clientY - t.y0) / 50; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      mov.x = dx; mov.y = dy; palI.style.transform = 'translate(' + dx * 36 + 'px,' + dy * 36 + 'px)';
    } else if (t.rol === 'mirar' || t.mira || (t.rol === 'raton' && !document.pointerLockElement)) { mirar(e.clientX - t.x, e.clientY - t.y); t.x = e.clientX; t.y = e.clientY; }
  });
  function soltar(e) {
    const t = toques.get(e.pointerId); if (!t) return; toques.delete(e.pointerId);
    if (t.rol === 'mover') { mov.x = mov.y = 0; pal.hidden = true; }
    if (t.rol === 'raton') { if (e.button === 0 || e.buttons === 0) disparando = false; if (e.button === 2) P.mira = false; }
    if (t.up) { t.up(); t.b.classList.remove('on'); }
  }
  addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
  addEventListener('mousemove', e => { if (document.pointerLockElement === capa && jugando && !pausado) mirar(e.movementX, e.movementY, 0.0022); });
  capa.addEventListener('contextmenu', e => e.preventDefault());
  function boton(id, abajo, arriba) {
    const b = $(id);
    b.addEventListener('pointerdown', e => {
      e.stopPropagation(); e.preventDefault(); Snd.init(); if (!G || pausado && id !== 'bPausa') return;
      b.classList.add('on'); abajo && abajo();
      if (arriba) toques.set(e.pointerId, { rol: 'boton', up: arriba, b, x: e.clientX, y: e.clientY, mira: true });
      else setTimeout(() => b.classList.remove('on'), 140);
    });
    b.addEventListener('click', e => e.preventDefault());
  }
  const pulsaFuego = () => { disparando = true; G.pedido = 0.3; };
  boton('bFuego', pulsaFuego, () => disparando = false);
  boton('fuego2', () => { if (G.caza) { G.cohetePed = true; return; } if (G.carro || G.vuelo) G.mgCarro = true; else pulsaFuego(); }, () => { disparando = false; if (G) G.mgCarro = false; });
  boton('bMira', () => P.mira = !P.mira);
  boton('bRec', recargar);
  boton('bAgach', () => P.agach = !P.agach);
  boton('bGran', lanzarGranada);
  boton('bViva', gritoViva);
  boton('bArma', cambiarArma);
  boton('bCura', curar);
  boton('bCuch', acuchillar);
  function ordenar() {
    const sig = { auto: 'cubrir', cubrir: 'asalto', asalto: 'auto' }[G.orden || 'auto']; G.orden = sig;
    $('bOrden').innerHTML = 'ORDEN<br>' + { auto: 'AUTO', cubrir: 'CUBRIR', asalto: 'ASALTO' }[sig];
    if (sig === 'cubrir') { voz('cubridme', '¡CUBRIDME!', 1); aviso('La escuadra se queda a cubierto y te cubre con su fuego', 3); }
    else if (sig === 'asalto') { voz('asalto', '¡AL ASALTO!', 1); aviso('La escuadra se lanza al asalto', 3); }
    else aviso('La escuadra avanza por saltos, a su aire', 2.5);
  }
  boton('bOrden', ordenar);
  boton('bAvion', pedirAvion);
  boton('bPausa', () => pausar(true));
  addEventListener('keydown', e => {
    if (!G || !jugando) return;
    teclas[e.code] = true;
    if (e.code === 'Escape') { pausar(!pausado); return; }
    if (pausado) return;
    if (e.code === 'KeyR') recargar(); else if (e.code === 'KeyG') lanzarGranada(); else if (e.code === 'KeyC') P.agach = !P.agach;
    else if (e.code === 'KeyV') gritoViva(); else if (e.code === 'KeyQ') cambiarArma(); else if (e.code === 'KeyH') curar(); else if (e.code === 'KeyF') acuchillar(); else if (e.code === 'KeyT') ordenar(); else if (e.code === 'KeyB') pedirAvion();
  });
  addEventListener('keyup', e => { teclas[e.code] = false; });
  addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; if (jugando && !pausado) pausar(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && jugando && !pausado) pausar(true); });

  window.__ifni = { get G() { return G; }, P, empezar, get ARMAS() { return ARMAS; }, trazar, cam, get jugando() { return jugando; } };

  UI.init(abrirParte);
  UI.portada();
  app.classList.toggle('zurdo', AJ.zurdo);
  redim(); alMenu(); requestAnimationFrame(bucle);
})();
