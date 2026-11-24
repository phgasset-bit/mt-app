// Avatar del legionario: cara, pelo, barba, tocado, uniforme, pañuelo, tatuaje, medallas en el pecho y heridas de guerra.
// Se ve en la pestaña «Mi legionario» con un visor 3D que gira solo y se puede arrastrar.
const Avatar = (() => {
  const C = THREE, lin = World.lin;
  const PIEL = [0xe2b792, 0xcc9c74, 0xab7a52, 0x7f5636];
  const PELO = [0x1c1612, 0x4a3324, 0x8a6a3a, 0x9c9a94];
  const COSMETICOS = {
    fisico: { atletico: { nom: 'Atlético' }, cachas: { nom: 'Cachas' }, muycachas: { nom: 'Muy cachas' } },
    tocado: { gorrillo: { nom: 'Gorrillo con borla roja' }, sin: { nom: 'Sin tocado' }, casco: { nom: 'Casco modelo 42', pts: 250 }, gala: { nom: 'Gorrillo de gala, borla dorada', oro: 25 } },
    camisa: { caqui: { nom: 'Camisa caqui de campaña' }, verde: { nom: 'Uniforme verde de paseo', pts: 450 }, gala: { nom: 'Correaje blanco de gala', oro: 45, rango: 4 } },
    barba: { corta: { nom: 'Barba corta' }, bigote: { nom: 'Bigote' }, ninguna: { nom: 'Afeitado' }, gastador: { nom: 'Barba de gastador', oro: 25 } },
    panuelo: { no: { nom: 'Sin pañuelo' }, rojo: { nom: 'Pañuelo rojo al cuello', pts: 200 } }
  };
  const HERIDAS = {
    ojo: { nom: 'Ojo izquierdo perdido', txt: 'Llevas parche en el ojo izquierdo.' },
    cicatriz: { nom: 'Cicatriz de metralla', txt: 'Una cicatriz te cruza la mejilla.' },
    cabeza: { nom: 'Herida en la cabeza', txt: 'Llevas la cabeza vendada.' }
  };
  const M = (c, extra) => World.mat(c, null, extra);
  const geo = {};
  function g(nombre, f) { return geo[nombre] || (geo[nombre] = f()); }

  // avatar con el modelo esculpido: cuerpo según físico, cabeza según barba, tocado y detalles en los huesos
  function construirEsculpido() {
    const P = Progreso.P, av = P.avatar, M2 = c => World.mat(c, null, { side: C.FrontSide });
    const fisico = av.fisico || 'cachas', barba = av.barba || 'corta';
    const piezas = ['cuerpo_' + fisico + '_alta', 'cabeza_' + barba + '_alta'];
    if (av.tocado === 'gorrillo' || av.tocado === 'gala') piezas.push('gorrillo_alta'); else if (av.tocado === 'casco') piezas.push('casco_alta');
    const h = Humanos.crear(piezas, Humanos.paletaAvatar(av)), B = h.B;
    const pon = (hueso, geo, mat, p, s, r) => { const m = new C.Mesh(geo, mat); m.position.copy(Humanos.local(hueso, p)); if (s) m.scale.set(...s); if (r) m.rotation.set(...r); m.castShadow = true; B[hueso].add(m); return m; };
    const esfera = new C.SphereGeometry(1, 20, 14), caja = new C.BoxGeometry(1, 1, 1), cil = new C.CylinderGeometry(1, 1, 1, 24);
    const muscular = { atletico: 0, cachas: 1, muycachas: 2 }[fisico];
    // medallas: pasadores sobre el pecho izquierdo
    const ids = Object.keys(Progreso.MEDALLAS).filter(id => P.medallas[id]), zp = -0.13 - 0.012 * muscular;
    ids.forEach((id, i) => {
      const f = Math.floor(i / 3), c = i % 3, x = -0.05 - c * 0.034, y = 1.40 - f * 0.018;
      pon('pecho', caja, M2(Progreso.MEDALLAS[id].color), [x, y, zp], [0.032, 0.014, 0.008]);
      pon('pecho', caja, M2(0xffc400), [x, y, zp - 0.002], [0.008, 0.014, 0.006]);
    });
    if (P.medallas.laureada) pon('pecho', cil, World.mat(0xe8b923, 'phong', { shininess: 80 }), [0.085, 1.37, zp + 0.005], [0.022, 0.006, 0.022], [Math.PI / 2, 0, 0]);
    // tatuaje en la cara exterior del antebrazo izquierdo
    if (P.equipo.tat && P.equipo.tat !== 'ninguno') {
      const J = Humanos.man.juntas, e = new C.Vector3(...J.codoI), w = new C.Vector3(...J.munecaI), p = e.clone().lerp(w, 0.42);
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; Progreso.dibujaTatuaje(P.equipo.tat, cv.getContext('2d'), 64, 64, 1.45);
      const t = new C.CanvasTexture(cv); t.encoding = C.sRGBEncoding;
      const d = new C.Mesh(new C.PlaneGeometry(0.07, 0.07), new C.MeshLambertMaterial({ map: t, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
      d.position.copy(Humanos.local('antebrazoI', [p.x - 0.006, p.y, p.z - 0.045 - 0.006 * muscular])); d.rotation.y = Math.PI; d.rotation.z = -0.2; B.antebrazoI.add(d);
    }
    // pañuelo
    if (av.panuelo === 'rojo') pon('cuello', new C.CylinderGeometry(0.075, 0.1, 0.05, 24, 1, true), World.mat(0xb3261e, null, { side: C.DoubleSide }), [0, 1.5, 0.0]);
    // heridas de guerra
    if (P.mostrarHeridas) {
      const o = Humanos.man.ojoI;
      if (P.heridas.ojo) {
        pon('cabeza', esfera, World.mat(0x111111), [o[0], o[1], o[2] - 0.012], [0.019, 0.016, 0.008]);
        pon('cabeza', new C.TorusGeometry(0.098, 0.0028, 6, 40), World.mat(0x111111), [0, 1.69, 0.0], [1, 1, 1.08], [Math.PI / 2 - 0.35, 0, -0.32]);
      }
      if (P.heridas.cicatriz) pon('cabeza', caja, World.mat(0xa05a4a), [0.05, 1.655, -0.088], [0.004, 0.04, 0.004], [0, -0.5, 0.35]);
      if (P.heridas.cabeza) { pon('cabeza', cil, World.mat(0xf0ece2), [0, 1.735, 0.005], [0.091, 0.03, 0.101]); pon('cabeza', esfera, World.mat(0x8a1c1c), [0.045, 1.738, -0.08], [0.012, 0.01, 0.005]); }
    }
    // fusil a la espalda
    const f = new C.Group(); f.position.copy(Humanos.local('pecho', [0, 1.2, 0.17 + 0.01 * muscular])); f.rotation.z = -0.75; B.pecho.add(f);
    const fm = (c, y, sx, sy, sz) => { const m = new C.Mesh(caja, World.mat(c)); m.position.y = y; m.scale.set(sx, sy, sz); m.castShadow = true; f.add(m); };
    fm(0x6a4426, 0, 0.05, 0.95, 0.06); fm(0x2a2a2a, 0.62, 0.025, 0.35, 0.025);
    B.brazoI.rotation.z = 0.1; B.brazoD.rotation.z = -0.1;
    const raiz = new C.Group(); raiz.add(h.g); h.g.rotation.y = Math.PI; return raiz;
  }

  function construir(o) {
    if (typeof Humanos !== 'undefined' && Humanos.listo) return construirEsculpido();
    const P = Progreso.P, av = P.avatar, grupo = new C.Group();
    const piel = M(PIEL[av.piel] || PIEL[0]), pelo = M(PELO[av.pelo] || PELO[0]);
    const tela = av.camisa === 'caqui' ? 0x7a7350 : 0x4d5a3a, pantalon = av.camisa === 'caqui' ? 0x6c6747 : 0x404b31;
    const cuero = av.camisa === 'gala' ? M(0xf2f0e8) : M(0x5a3f25);
    const add = (geometria, mat, padre, x, y, z, sx, sy, sz, rx, ry, rz) => {
      const m = new C.Mesh(geometria, mat); m.position.set(x || 0, y || 0, z || 0);
      if (sx) m.scale.set(sx, sy, sz); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; (padre || grupo).add(m); return m;
    };
    const esfera = g('esf', () => new C.SphereGeometry(1, 24, 18)), caja = g('caja', () => new C.BoxGeometry(1, 1, 1)), cil = g('cil', () => new C.CylinderGeometry(1, 1, 1, 20));
    const cono = (r1, r2) => g('cono' + r1 + r2, () => new C.CylinderGeometry(r1, r2, 1, 20));
    // piernas y botas
    [-0.11, 0.11].forEach(x => {
      add(cono(0.09, 0.075), M(pantalon), null, x, 0.72, 0, 1, 0.5, 1);
      add(cono(0.075, 0.062), M(0x8a8466), null, x, 0.3, 0, 1, 0.42, 1);              // polainas
      add(caja, M(0x2a2118), null, x, 0.05, 0.04, 0.13, 0.1, 0.28);
    });
    // torso, camisa abierta
    add(cono(0.22, 0.18), M(tela), null, 0, 1.25, 0, 1, 0.6, 0.62);
    [-1, 1].forEach(l => add(esfera, M(tela), null, l * 0.2, 1.5, 0, 0.085, 0.07, 0.09));   // hombros
    add(caja, piel, null, 0, 1.47, 0.12, 0.13, 0.14, 0.02, -0.15);                       // pecho al aire
    add(caja, M(tela), null, -0.07, 1.5, 0.125, 0.09, 0.09, 0.02, -0.15, 0, -0.5);       // solapas
    add(caja, M(tela), null, 0.07, 1.5, 0.125, 0.09, 0.09, 0.02, -0.15, 0, 0.5);
    add(caja, cuero, null, 0, 0.98, 0, 0.42, 0.08, 0.28);                                 // cinturón
    add(caja, M(0xc9a227), null, 0, 0.98, 0.142, 0.06, 0.05, 0.01);                        // hebilla
    add(caja, cuero, null, 0, 1.25, 0, 0.05, 0.62, 0.3, 0, 0, 0.55);                      // tirante
    [-0.11, 0.11].forEach(x => add(caja, cuero, null, x, 1.04, 0.14, 0.11, 0.1, 0.06));  // cartucheras
    if (av.panuelo === 'rojo') add(cono(0.07, 0.16), M(0xb3261e), null, 0, 1.53, 0.02, 1, 0.12, 0.7);
    // medallas: pasadores en el pecho izquierdo (a la derecha en pantalla)
    const ids = Object.keys(Progreso.MEDALLAS).filter(id => P.medallas[id]);
    ids.forEach((id, i) => {
      const col = Progreso.MEDALLAS[id].color, fila = Math.floor(i / 3), pos = i % 3;
      add(caja, M(col), null, 0.075 + pos * 0.042, 1.39 - fila * 0.022, 0.135, 0.038, 0.018, 0.012);
      add(caja, M(0xffc400), null, 0.075 + pos * 0.042, 1.39 - fila * 0.022, 0.142, 0.01, 0.018, 0.004);
    });
    if (P.medallas.laureada) { const l = add(cil, M(0xe8b923, { emissive: lin(0x3a2a00) }), null, -0.1, 1.36, 0.14, 0.035, 0.008, 0.035, Math.PI / 2); l.rotation.x = Math.PI / 2; }
    // brazos remangados con tatuaje en el antebrazo izquierdo
    [-1, 1].forEach(lado => {
      const hombro = new C.Group(); hombro.position.set(lado * 0.26, 1.48, 0); hombro.rotation.z = lado * 0.12; grupo.add(hombro);
      add(cono(0.065, 0.06), M(tela), hombro, 0, -0.16, 0, 1, 0.32, 1);
      add(cono(0.07, 0.068), M(tela), hombro, 0, -0.33, 0, 1, 0.05, 1);                   // remango
      add(cono(0.055, 0.045), piel, hombro, 0, -0.5, 0, 1, 0.3, 1);
      add(esfera, piel, hombro, 0, -0.68, 0, 0.05, 0.06, 0.045);
      if (lado === 1 && P.equipo.tat && P.equipo.tat !== 'ninguno') {
        const c = document.createElement('canvas'); c.width = 128; c.height = 128;
        Progreso.dibujaTatuaje(P.equipo.tat, c.getContext('2d'), 64, 64, 1.45);
        const t = new C.CanvasTexture(c); t.encoding = C.sRGBEncoding;
        const d = new C.Mesh(new C.PlaneGeometry(0.1, 0.1), new C.MeshLambertMaterial({ map: t, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
        d.position.set(0, -0.5, 0.053); hombro.add(d);
      }
    });
    // fusil a la espalda
    const fusil = new C.Group(); fusil.position.set(0, 1.2, -0.17); fusil.rotation.z = 0.75; grupo.add(fusil);
    add(caja, M(0x6a4426), fusil, 0, 0, 0, 0.05, 0.95, 0.06); add(caja, M(0x2a2a2a), fusil, 0, 0.62, 0, 0.025, 0.35, 0.025);
    // cabeza
    const cab = new C.Group(); cab.position.y = 1.68; grupo.add(cab);
    add(cono(0.055, 0.06), piel, cab, 0, -0.1, 0, 1, 0.1, 1);
    add(esfera, piel, cab, 0, 0, 0, 0.105, 0.125, 0.115);
    add(esfera, piel, cab, 0, -0.01, 0.112, 0.022, 0.03, 0.025);                          // nariz
    [-1, 1].forEach(l => add(esfera, piel, cab, l * 0.105, 0, 0, 0.02, 0.035, 0.02));    // orejas
    const ojos = [-1, 1].filter(l => !(l === 1 && P.heridas.ojo && P.mostrarHeridas));
    ojos.forEach(l => { add(esfera, M(0xf2efe6), cab, l * 0.04, 0.025, 0.098, 0.018, 0.012, 0.01); add(esfera, M(0x2a1d14), cab, l * 0.04, 0.025, 0.106, 0.008, 0.008, 0.005); });
    [-1, 1].forEach(l => add(caja, pelo, cab, l * 0.042, 0.052, 0.104, 0.04, 0.008, 0.01, 0, 0, l * -0.12)); // cejas
    add(caja, M(0x7a4a38), cab, 0, -0.06, 0.106, 0.04, 0.006, 0.01);                       // boca
    if (av.tocado !== 'casco') add(esfera, pelo, cab, 0, 0.045, -0.025, 0.108, 0.094, 0.108);  // pelo corto
    if (av.barba === 'bigote') add(caja, pelo, cab, 0, -0.035, 0.11, 0.06, 0.014, 0.012);
    if (av.barba === 'gastador') { add(esfera, pelo, cab, 0, -0.07, 0.04, 0.1, 0.09, 0.095); add(caja, pelo, cab, 0, -0.035, 0.112, 0.065, 0.016, 0.012); add(esfera, piel, cab, 0, -0.06, 0.112, 0.022, 0.012, 0.006); }
    // heridas de guerra
    if (P.mostrarHeridas) {
      if (P.heridas.ojo) { add(esfera, M(0x111111), cab, 0.042, 0.025, 0.1, 0.03, 0.026, 0.012); add(g('cinta', () => new C.TorusGeometry(0.113, 0.004, 4, 32)), M(0x111111), cab, 0, 0.03, 0, 1, 1.1, 1, 0.2, 0, -0.28); }
      if (P.heridas.cicatriz) add(caja, M(0xa05a4a), cab, -0.06, -0.02, 0.092, 0.006, 0.05, 0.004, 0, 0.5, 0.4);
      if (P.heridas.cabeza) { add(cil, M(0xf0ece2), cab, 0, 0.078, 0, 0.096, 0.042, 0.106); add(esfera, M(0x8a1c1c), cab, -0.05, 0.08, 0.088, 0.014, 0.011, 0.006); }
    }
    // tocado
    if (av.tocado === 'gorrillo' || av.tocado === 'gala') {
      add(cil, M(0x3c4a33), cab, 0, 0.12, 0, 0.085, 0.06, 0.125, 0, 0, 0);
      add(esfera, M(0x3c4a33), cab, 0, 0.15, 0, 0.08, 0.03, 0.12);
      const borla = av.tocado === 'gala' ? M(0xe8b923) : M(0xb3261e);
      add(caja, borla, cab, 0, 0.125, 0.132, 0.003, 0.04, 0.003);
      add(esfera, borla, cab, 0, 0.1, 0.136, 0.013, 0.019, 0.013);
    } else if (av.tocado === 'casco') add(g('casco', () => new C.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55)), M(0x535a3e), cab, 0, 0.02, 0, 0.145, 0.15, 0.155);
    return grupo;
  }

  // ---------- visor ----------
  let rend = null, escena, camara, modelo, angulo = 0.4, arrastre = null, activo = false;
  let enBucle = false;
  function montar(canvas) {
    // si la pestaña se ha vuelto a dibujar, el lienzo es otro: se rehace el visor sobre el nuevo
    if (rend && rend.domElement !== canvas) { try { rend.dispose(); rend.forceContextLoss(); } catch (e) {} rend = null; }
    if (!rend) {
      rend = new C.WebGLRenderer({ canvas, antialias: true, alpha: true });
      rend.outputEncoding = C.sRGBEncoding; rend.toneMapping = C.ACESFilmicToneMapping; rend.shadowMap.enabled = true;
      escena = new C.Scene();
      escena.add(new C.HemisphereLight(lin(0xfff1dc), lin(0x6a4a2e), 1.1));
      const sol = new C.DirectionalLight(lin(0xffeccc), 2.2); sol.position.set(2, 4, 3); sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024); escena.add(sol);
      const suelo = new C.Mesh(new C.CircleGeometry(0.9, 40), new C.MeshLambertMaterial({ color: lin(0xb88b5a), map: World.tex().suelo })); suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; escena.add(suelo);
      camara = new C.PerspectiveCamera(30, 1, 0.1, 20);
      canvas.addEventListener('pointerdown', e => { arrastre = e.clientX; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', e => { if (arrastre != null) { angulo += (e.clientX - arrastre) * 0.012; arrastre = e.clientX; } });
      canvas.addEventListener('pointerup', () => arrastre = null);
      if (!enBucle) { enBucle = true; requestAnimationFrame(bucle); }
    }
    actualizar();
  }
  function actualizar() {
    if (!escena) return;
    if (modelo) escena.remove(modelo);
    modelo = construir(); escena.add(modelo);
  }
  let enfoque = 'cuerpo';
  function bucle() {
    requestAnimationFrame(bucle);
    if (!activo || !rend) return;
    const c = rend.domElement, w = c.clientWidth, h = c.clientHeight;
    if (w && (c.width !== Math.round(w * Math.min(2, devicePixelRatio)) || c.height !== Math.round(h * Math.min(2, devicePixelRatio)))) { rend.setPixelRatio(Math.min(2, devicePixelRatio)); rend.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); }
    if (arrastre == null) angulo += 0.004;
    modelo.rotation.y = angulo;
    if (enfoque === 'cara') { camara.position.set(0, 1.66, 1.0); camara.lookAt(0, 1.63, 0); }
    else { camara.position.set(0, 1.0, 4.3); camara.lookAt(0, 0.92, 0); }
    rend.render(escena, camara);
  }
  return { COSMETICOS, HERIDAS, PIEL, PELO, montar, actualizar, set activo(v) { activo = v; }, set enfoque(v) { enfoque = v; } };
})();
