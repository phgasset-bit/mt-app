// Modelos humanos esculpidos (tools/gen_humanos.py): carga, colores por material y montaje con esqueleto.
const Humanos = (() => {
  const C = THREE, lin = h => new C.Color(h).convertSRGBToLinear();
  let man = null, bin = null, listo = false, promesa = null;
  const geos = {};
  // materiales del generador: 0 piel 1 camisa 2 pantalón 3 cuero 4 bota 5 polaina 6 pelo 7 labio 8 ojo 9 iris 10 metal
  // 11 tela del gorrillo 12 borla 13 casco 14 turbante 15 chilaba 16 pupila
  const BASE = [0xc8956c, 0x8a8058, 0x766e4c, 0x5a3f25, 0x1e1914, 0xa59c78, 0x1c1612, 0xa86a5c, 0xe8e2d6, 0x4a2e1a, 0xb8962e, 0x3c4a33, 0xb3261e, 0x535a3e, 0xe8e0cc, 0x8d7b62, 0x0a0806];
  const PIEL = [0xe0b08a, 0xc8956c, 0xa87650, 0x7a5232];
  const PELO = [0x1c1612, 0x4a3324, 0x8a6a3a, 0x9c9a94];
  const UNIFORME = { caqui: [0x8a8058, 0x766e4c, 0x5a3f25], verde: [0x4f5c3c, 0x434f33, 0x3a2a1a], gala: [0x4f5c3c, 0x434f33, 0xf2f0e8] };

  function cargar() {
    if (promesa) return promesa;
    promesa = Promise.all([fetch('modelos/humanos.json').then(r => r.json()), fetch('modelos/humanos.bin').then(r => r.arrayBuffer())])
      .then(([m, b]) => { man = m; bin = b; listo = true; return true; })
      .catch(() => { listo = false; return false; });
    return promesa;
  }
  function base(nombre) {
    if (geos[nombre]) return geos[nombre];
    const e = man.mallas[nombre], g = new C.BufferGeometry();
    g.setAttribute('position', new C.BufferAttribute(new Float32Array(bin, e.pos, e.v * 3), 3));
    g.setAttribute('normal', new C.BufferAttribute(new Int8Array(bin, e.nor, e.v * 3), 3, true));
    g.setAttribute('skinIndex', new C.BufferAttribute(new Uint8Array(bin, e.jnt, e.v * 4), 4));
    // pesos a coma flotante y normalizados: con 8 bits la suma no da 1 y los vértices se desplazan
    const w8 = new Uint8Array(bin, e.wgt, e.v * 4), w = new Float32Array(e.v * 4);
    for (let i = 0; i < e.v; i++) { const s = w8[i * 4] + w8[i * 4 + 1] + w8[i * 4 + 2] + w8[i * 4 + 3] || 1; for (let k = 0; k < 4; k++) w[i * 4 + k] = w8[i * 4 + k] / s; }
    g.setAttribute('skinWeight', new C.BufferAttribute(w, 4));
    g.setIndex(new C.BufferAttribute(e.idx32 ? new Uint32Array(bin, e.idx, e.i) : new Uint16Array(bin, e.idx, e.i), 1));
    g.userData.mat = new Uint8Array(bin, e.mat, e.v);
    g.userData.mez = new Uint8Array(bin, e.mez, e.v);
    g.computeBoundingSphere();
    return geos[nombre] = g;
  }
  // paleta: objeto {indice de material: color hex}; el resto toma el color base
  function geometria(nombre, paleta) {
    const b = base(nombre), g = new C.BufferGeometry();
    for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) g.setAttribute(k, b.attributes[k]);
    g.setIndex(b.index); g.boundingSphere = b.boundingSphere;
    const m = b.userData.mat, mz = b.userData.mez, p = b.attributes.position.array, col = new Float32Array(m.length * 3), cache = {};
    const piel = lin(paleta && paleta[0] != null ? paleta[0] : BASE[0]);
    for (let i = 0; i < m.length; i++) {
      const id = m[i]; const c = cache[id] || (cache[id] = lin(paleta && paleta[id] != null ? paleta[id] : BASE[id] != null ? BASE[id] : 0xff00ff));
      // variación suave para que piel y tela no parezcan plástico
      const n = 0.97 + 0.06 * (Math.sin(p[i * 3] * 41.7 + p[i * 3 + 1] * 27.3) * Math.sin(p[i * 3 + 2] * 33.1 + p[i * 3 + 1] * 19.9) * 0.5 + 0.5);
      const k = id === 8 || id === 9 || id === 16 ? 1 : n, t = mz[i] / 255, s = piel;
      col[i * 3] = (s.r + (c.r - s.r) * t) * k; col[i * 3 + 1] = (s.g + (c.g - s.g) * t) * k; col[i * 3 + 2] = (s.b + (c.b - s.b) * t) * k;
    }
    g.setAttribute('color', new C.BufferAttribute(col, 3));
    return g;
  }
  let matPiel = null;
  function material() { return matPiel || (matPiel = new C.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: 0.78, metalness: 0 })); }
  function esqueleto() {
    const huesos = man.huesos.map(h => { const b = new C.Bone(); b.name = h.n; return b; });
    man.huesos.forEach((h, i) => {
      if (h.padre < 0) huesos[i].position.set(h.p[0], h.p[1], h.p[2]);
      else { const q = man.huesos[h.padre].p; huesos[i].position.set(h.p[0] - q[0], h.p[1] - q[1], h.p[2] - q[2]); huesos[h.padre].add(huesos[i]); }
    });
    return huesos;
  }
  // monta un humano con varias piezas que comparten esqueleto
  function crear(piezas, paleta) {
    const g = new C.Group(), huesos = esqueleto();
    g.add(huesos[0]); g.updateMatrixWorld(true);
    const sk = new C.Skeleton(huesos), mallas = [];
    for (const p of piezas) {
      const m = new C.SkinnedMesh(geometria(p, paleta), material());
      m.castShadow = true; m.receiveShadow = true; g.add(m); m.updateMatrixWorld(true); m.bind(sk); mallas.push(m);
    }
    const B = {}; huesos.forEach(b => B[b.name] = b);
    if (piezas.some(p => /^(cabeza|turbante)_/.test(p))) ponerOjos(B.cabeza, paleta && paleta.iris);
    return { g, B, mallas, sk };
  }
  let geoOjo = null, matOjo = null, geoIris = null, geoPupila = null, matPupila = null; const matIris = {};
  function ponerOjos(cabeza, iris) {
    if (!geoOjo) {
      geoOjo = new C.SphereGeometry(0.0118, 20, 14); matOjo = new C.MeshStandardMaterial({ color: lin(0xe9e4da), roughness: 0.25 });
      geoIris = new C.CircleGeometry(0.0055, 20); geoPupila = new C.CircleGeometry(0.0024, 16); matPupila = new C.MeshStandardMaterial({ color: 0x050403, roughness: 0.2 });
    }
    const mi = matIris[iris || 0x4a2e1a] || (matIris[iris || 0x4a2e1a] = new C.MeshStandardMaterial({ color: lin(iris || 0x4a2e1a), roughness: 0.3 }));
    for (const e of man.ojos) {
      const o = local('cabeza', e), g = new C.Group(); g.position.copy(o); cabeza.add(g);
      g.add(new C.Mesh(geoOjo, matOjo));
      const i = new C.Mesh(geoIris, mi); i.position.z = -0.0114; i.rotation.y = Math.PI; g.add(i);
      const p = new C.Mesh(geoPupila, matPupila); p.position.z = -0.0118; p.rotation.y = Math.PI; g.add(p);
    }
  }
  // posición de reposo de un hueso o junta, relativa a su hueso
  function junta(nombre) { return man.juntas[nombre]; }
  function local(hueso, p) { const h = man.huesos.find(x => x.n === hueso).p; return new C.Vector3(p[0] - h[0], p[1] - h[1], p[2] - h[2]); }

  // soldados del combate (nivel bajo)
  const BARBAS = ['ninguna', 'bigote', 'corta', 'gastador'];
  function legionario(k) {
    const paleta = { 0: PIEL[k % 3], 6: PELO[(k * 7) % 3] };
    const piezas = [k % 3 === 2 ? 'cuerpo_muycachas_baja' : 'cuerpo_cachas_baja', 'cabeza_' + BARBAS[(k * 5 + 1) % 4] + '_baja', k % 3 === 2 ? 'casco_baja' : 'gorrillo_baja'];
    return crear(piezas, paleta);
  }
  const TUNICAS = [0x8d7b62, 0x6e6352, 0xbcae90, 0x5a5046, 0x9c8a6c, 0x7a6a50];
  const TURBANTES = [0xece4d0, 0xd2c6a8, 0x6b5c45, 0x3d4a5a];
  function enemigo(k) {
    const paleta = { 0: [0x9c6c4a, 0x875a3a, 0xa87754][k % 3], 15: TUNICAS[k % TUNICAS.length], 14: TURBANTES[(k * 3) % TURBANTES.length], 6: 0x1a120c, 4: 0x6a5236 };
    return crear(['cuerpo_moro_baja', k % 3 ? 'turbante_corta_baja' : 'turbante_ninguna_baja'], paleta);
  }
  // paleta del avatar del jugador
  function paletaAvatar(av) {
    const u = UNIFORME[av.camisa] || UNIFORME.caqui;
    return { 0: PIEL[av.piel] || PIEL[1], 6: PELO[av.pelo] || PELO[0], 1: u[0], 2: u[1], 3: u[2], 12: av.tocado === 'gala' ? 0xe8b923 : 0xb3261e };
  }
  return { cargar, crear, legionario, enemigo, geometria, paletaAvatar, junta, local, PIEL, PELO, get listo() { return listo; }, get man() { return man; } };
})();
