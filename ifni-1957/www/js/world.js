// Mundo 3D: terreno del Anti-Atlas / Sáhara, vegetación, parapetos, fuerte, soldados y avión.
// Gestión de color: los colores se escriben en sRGB y se convierten a lineal (salida sRGB + tone mapping ACES).
const World = (() => {
  const C = THREE;
  let M = null, seed = 1;
  const lin = h => new C.Color(h).convertSRGBToLinear();
  const mats = {};
  function mat(c, tipo, extra) {
    const k = c + '|' + (tipo || '') + '|' + (extra ? JSON.stringify(extra) : '');
    if (mats[k]) return mats[k];
    const o = Object.assign({ color: lin(c) }, extra || {});
    return mats[k] = tipo === 'phong' ? new C.MeshPhongMaterial(o) : new C.MeshLambertMaterial(o);
  }
  function rng(s) {
    s = Math.floor(s * 100000) | 0;
    return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  // ---------- ruido y altura ----------
  function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, z) { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, z * f); t += a; a *= 0.5; f *= 2.03; } return s / t; }
  function pathX(z) { return Math.sin(z * 0.013 + seed) * 14 + Math.sin(z * 0.031) * 5; }
  function height(x, z) {
    if (!M) return 0;
    let h = (fbm(x * 0.011 + 50, z * 0.011 + 50) - 0.5) * 2 * M.amp + (fbm(x * 0.05, z * 0.05) - 0.5) * M.amp * 0.22;
    const side = Math.abs(x);
    if (side > 110) h += (side - 110) * (M.desierto ? 0.04 : 0.22);
    for (let i = 0; i < M.bumps.length; i++) {
      const b = M.bumps[i], dx = x - b[0], dz = z - b[1];
      h += b[3] * Math.exp(-(dx * dx + dz * dz) / (b[2] * b[2] * 0.5));
    }
    if (M.mar) h -= Math.max(0, z - 228) * 0.35;
    return h;
  }
  function pendiente(x, z) { return (Math.abs(height(x + 2, z) - height(x - 2, z)) + Math.abs(height(x, z + 2) - height(x, z - 2))) / 4; }

  // ---------- colisiones (círculos en rejilla) y obstáculos para balas ----------
  const CELL = 8, grid = new Map(), blockers = [], circulos = [];
  function addCircle(x, z, r) {
    const c = { x, z, r }; circulos.push(c);
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++)
      for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
        const k = i + ',' + j; let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(c);
      }
  }
  function colisiona(p, r) {
    const l = grid.get(Math.floor(p.x / CELL) + ',' + Math.floor(p.z / CELL));
    if (!l) return;
    for (let n = 0; n < l.length; n++) {
      const c = l[n], dx = p.x - c.x, dz = p.z - c.z, m = c.r + r, d2 = dx * dx + dz * dz;
      if (d2 < m * m && d2 > 1e-6) { const d = Math.sqrt(d2); p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
    }
  }
  // obstáculo útil como cobertura más cercano a (x,z)
  function coberturaCerca(x, z, rad) {
    let mejor = null, md = rad * rad;
    for (let i = Math.floor((x - rad) / CELL); i <= Math.floor((x + rad) / CELL); i++)
      for (let j = Math.floor((z - rad) / CELL); j <= Math.floor((z + rad) / CELL); j++) {
        const l = grid.get(i + ',' + j); if (!l) continue;
        for (const c of l) { if (c.r < 0.55) continue; const d = (c.x - x) ** 2 + (c.z - z) ** 2; if (d < md) { md = d; mejor = c; } }
      }
    return mejor;
  }
  const ray = new C.Raycaster();
  function obstaculo(o, dir, maxD) {
    ray.set(o, dir); ray.far = maxD;
    const hits = ray.intersectObjects(blockers, false);
    let d = hits.length ? hits[0].distance : maxD;
    for (let t = 1.5; t < d; t += 2) {
      if (o.y + dir.y * t < height(o.x + dir.x * t, o.z + dir.z * t)) return Math.max(0, t - 1);
    }
    return d;
  }

  // ---------- texturas procedurales ----------
  function canvasTex(w, h, pinta, srgb) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; pinta(c.getContext('2d'), w, h);
    const t = new C.CanvasTexture(c); if (srgb !== false) t.encoding = C.sRGBEncoding; return t;
  }
  const TEX = {};
  function tex() {
    if (TEX.humo) return TEX;
    TEX.humo = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
    TEX.fogon = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,250,225,1)'); r.addColorStop(0.25, 'rgba(255,205,90,.95)'); r.addColorStop(1, 'rgba(255,120,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
    TEX.marca = canvasTex(64, 64, (g) => { g.fillStyle = '#f2b90f'; g.strokeStyle = '#1d1710'; g.lineWidth = 5; g.beginPath(); g.moveTo(8, 10); g.lineTo(56, 10); g.lineTo(32, 54); g.closePath(); g.stroke(); g.fill(); });
    TEX.bandera = canvasTex(96, 64, (g) => { g.fillStyle = '#c60b1e'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#ffc400'; g.fillRect(0, 16, 96, 32); });
    TEX.suelo = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = 'rgb(236,236,236)'; g.fillRect(0, 0, w, h);
      const id = g.getImageData(0, 0, w, h), d = id.data;
      for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 34; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      g.putImageData(id, 0, 0);
      for (let i = 0; i < 420; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 0.6 + Math.random() * 2.4, c = 150 + Math.random() * 105 | 0;
        g.fillStyle = 'rgba(' + c + ',' + (c - 6) + ',' + (c - 14) + ',.6)';
        for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.beginPath(); g.ellipse(x + ox, y + oy, r, r * 0.7, Math.random() * 3, 0, 6.3); g.fill(); }
      }
    }, false);
    TEX.suelo.wrapS = TEX.suelo.wrapT = C.RepeatWrapping; TEX.suelo.repeat.set(110, 110); TEX.suelo.anisotropy = 4;
    TEX.revoco = TEX.suelo.clone(); TEX.revoco.needsUpdate = true; TEX.revoco.repeat.set(2, 1);
    TEX.hierba = canvasTex(64, 64, (g) => {
      for (let i = 0; i < 26; i++) {
        const x = 6 + Math.random() * 52, hgt = 22 + Math.random() * 38, inc = (Math.random() - 0.5) * 22, c = Math.random();
        g.strokeStyle = 'rgb(' + (150 + c * 70 | 0) + ',' + (130 + c * 55 | 0) + ',' + (70 + c * 30 | 0) + ')'; g.lineWidth = 1.2 + Math.random() * 1.4;
        g.beginPath(); g.moveTo(x, 64); g.quadraticCurveTo(x + inc * 0.3, 64 - hgt * 0.6, x + inc, 64 - hgt); g.stroke();
      }
    });
    TEX.hierba.generateMipmaps = false; TEX.hierba.minFilter = C.LinearFilter;
    TEX.madera = canvasTex(32, 256, (g, w, h) => {
      g.fillStyle = '#6b4526'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(' + (40 + Math.random() * 40 | 0) + ',22,8,' + (0.2 + Math.random() * 0.3) + ')'; g.lineWidth = 0.5 + Math.random() * 1.5; const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 4, h * 0.3, x - 4, h * 0.7, x + 2, h); g.stroke(); }
    });
    return TEX;
  }

  // ---------- utilidades de construcción ----------
  const tmpO = new C.Object3D();
  function mtx(x, y, z, rx, ry, rz, sx, sy, sz) { tmpO.position.set(x, y, z); tmpO.rotation.set(rx, ry, rz); tmpO.scale.set(sx, sy, sz); tmpO.updateMatrix(); return tmpO.matrix.clone(); }
  function mtxY(...a) { tmpO.rotation.order = 'YXZ'; const r = mtx(...a); tmpO.rotation.order = 'XYZ'; return r; }
  function instancias(scn, geo, material, lista, sombra, bloquea) {
    if (!lista.length) return null;
    const im = new C.InstancedMesh(geo, material, lista.length);
    lista.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = !!sombra; im.receiveShadow = true; scn.add(im);
    if (bloquea) blockers.push(im);
    return im;
  }
  function geoRoca(semilla, det) {
    const g = new C.IcosahedronGeometry(1, det || 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 0.72 + 0.5 * Math.abs(Math.sin(x * 4.1 + semilla) * Math.cos(y * 3.7 - semilla) + Math.sin(z * 5.3 + semilla * 2) * 0.5);
      p.setXYZ(i, x * n, y * n * 0.75, z * n);
    }
    g.computeVertexNormals(); return g;
  }
  function caja(w, h, d, material, x, y, z, ry, scn, bloquea) {
    const m = new C.Mesh(new C.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z); m.rotation.y = ry || 0; m.castShadow = true; m.receiveShadow = true;
    scn.add(m); if (bloquea) blockers.push(m);
    return m;
  }
  function bloqueInvisible(scn, w, h, d, x, y, z, ry) {
    const m = new C.Mesh(new C.BoxGeometry(w, h, d), mat(0x000000)); m.visible = false;
    m.position.set(x, y, z); m.rotation.y = ry; scn.add(m); m.updateMatrixWorld(); blockers.push(m);
  }

  // ---------- construcción del escenario ----------
  let refs = {};
  const piedras = [], sacosL = [];
  function build(m, scn) {
    M = m; seed = m.seed; grid.clear(); blockers.length = 0; circulos.length = 0; piedras.length = 0; sacosL.length = 0;
    const T = tex(), R = rng(seed), noche = !!m.noche, des = !!m.desierto;
    const skyCol = noche ? 0x111a2c : des ? 0xe2d3b6 : 0xd3d6cc;
    scn.background = lin(skyCol);
    scn.fog = new C.Fog(lin(skyCol), noche ? 25 : 70, noche ? 210 : m.salto ? 400 : 520);

    // bóveda celeste
    const sg = new C.SphereGeometry(800, 32, 16), sc = [], top = new C.Color(noche ? 0x02040c : des ? 0x7fa3c2 : 0x5f8fbd), hor = new C.Color(skyCol), tc = new C.Color();
    for (let i = 0; i < sg.attributes.position.count; i++) { const y = sg.attributes.position.getY(i) / 800; tc.copy(hor).lerp(top, Math.min(1, Math.max(0, y * 2.4)) ** 0.8).convertSRGBToLinear(); sc.push(tc.r, tc.g, tc.b); }
    sg.setAttribute('color', new C.Float32BufferAttribute(sc, 3));
    scn.add(new C.Mesh(sg, new C.MeshBasicMaterial({ vertexColors: true, side: C.BackSide, fog: false, depthWrite: false })));
    const solDir = new C.Vector3(noche ? -0.4 : 0.55, noche ? 0.55 : 0.62, noche ? -0.7 : 0.4).normalize();
    const astro = new C.Sprite(new C.SpriteMaterial({ map: noche ? T.humo : T.fogon, color: noche ? lin(0xdfe6ff) : lin(0xfff6e0), fog: false, depthWrite: false, transparent: true, blending: C.AdditiveBlending }));
    astro.scale.setScalar(noche ? 40 : 160); astro.position.copy(solDir).multiplyScalar(700); scn.add(astro);
    if (noche) {
      const sp = []; for (let i = 0; i < 900; i++) { const a = R() * Math.PI * 2, e = 0.1 + R() * 1.35; sp.push(Math.cos(a) * Math.cos(e) * 760, Math.sin(e) * 760, Math.sin(a) * Math.cos(e) * 760); }
      const g = new C.BufferGeometry(); g.setAttribute('position', new C.Float32BufferAttribute(sp, 3));
      scn.add(new C.Points(g, new C.PointsMaterial({ color: 0xdfe6ff, size: 1.4, sizeAttenuation: false, fog: false })));
    } else {
      for (let i = 0; i < 14; i++) {
        const nube = new C.Sprite(new C.SpriteMaterial({ map: T.humo, color: lin(0xffffff), opacity: 0.35 + R() * 0.3, fog: false, depthWrite: false, transparent: true }));
        const a = R() * 6.28, r = 250 + R() * 350; nube.position.set(Math.cos(a) * r, 150 + R() * 90, Math.sin(a) * r); nube.scale.set(120 + R() * 140, 30 + R() * 30, 1); scn.add(nube);
      }
    }
    // sierras lejanas en capas (perspectiva aérea)
    sierra(scn, 470, des ? 25 : 70, noche ? 0x1c2436 : des ? 0xc9b48f : 0x9c8f80, hor, 1.3);
    sierra(scn, 610, des ? 40 : 120, noche ? 0x161d2c : des ? 0xd4c4a4 : 0xb3ad9f, hor, 4.7);

    // luces
    const hemi = new C.HemisphereLight(lin(noche ? 0x6a7fae : 0xfff1dc), lin(noche ? 0x1a1820 : 0x7a5838), noche ? 0.75 : 1.05);
    scn.add(hemi);
    const sun = new C.DirectionalLight(lin(noche ? 0xb0c4ee : 0xffeccc), noche ? 0.55 : 2.4);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sh = sun.shadow.camera; sh.left = -50; sh.right = 50; sh.top = 50; sh.bottom = -50; sh.near = 1; sh.far = 300; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    scn.add(sun); scn.add(sun.target);
    const flare = new C.PointLight(lin(0xfff1c8), 0, 300, 1.6); scn.add(flare);

    // terreno con color por vértice + textura de detalle
    const S = 640, N = 200, g = new C.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), cc = new C.Color(), tmp = new C.Color();
    const base = des ? new C.Color(0xd9b07a) : new C.Color(0xb88b5a);
    const roca = new C.Color(0x8a6450), roca2 = new C.Color(0x7d7368), matorral = new C.Color(0x7d7a4a), pista = new C.Color(0xd2b48a), arenaM = new C.Color(0xa69276), sombraC = new C.Color(0x8d6a45);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = height(x, z); pos.setY(i, y);
      const s = pendiente(x, z), n = fbm(x * 0.09, z * 0.09), n2 = fbm(x * 0.02 + 7, z * 0.02 - 3);
      cc.copy(base).lerp(sombraC, n2 * 0.5).multiplyScalar(0.88 + 0.24 * n);
      if (!des) {
        if (s > 0.3) cc.lerp(n > 0.5 ? roca : roca2, Math.min(1, (s - 0.3) * 2.4));
        if (fbm(x * 0.035 + 9, z * 0.035) > 0.58) cc.lerp(matorral, 0.4);
        const dp = Math.abs(x - pathX(z)); if (dp < 3.5) cc.lerp(pista, 0.6 * (1 - dp / 3.5));
      } else {
        cc.lerp(tmp.setHex(0xead1a2), Math.max(0, Math.min(1, y * 0.15))); // crestas de duna más claras
        if (s > 0.25) cc.lerp(tmp.setHex(0xb88d5e), Math.min(0.6, (s - 0.25) * 2));
      }
      if (m.mar && y < 0.4) cc.lerp(arenaM, 0.7);
      if (noche) cc.multiplyScalar(0.9);
      cc.convertSRGBToLinear();
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    g.setAttribute('color', new C.BufferAttribute(col, 3)); g.computeVertexNormals();
    const terr = new C.Mesh(g, new C.MeshLambertMaterial({ vertexColors: true, map: T.suelo })); terr.receiveShadow = true; scn.add(terr);
    { // llanura lejana bajo el borde del terreno, para que desde el aire no se vea el final del mapa
      const ll = new C.Mesh(new C.PlaneGeometry(1500, 1500), new C.MeshLambertMaterial({ color: lin(noche ? 0x3a3a3c : des ? 0xcdb58a : 0xa89474), map: T.suelo }));
      ll.rotation.x = -Math.PI / 2; ll.position.y = -2.6; scn.add(ll);
    }
    if (m.mar) { const w = new C.Mesh(new C.PlaneGeometry(900, 200), new C.MeshPhongMaterial({ color: lin(noche ? 0x16303e : 0x2c6378), shininess: 80, specular: lin(0x99aabb), transparent: true, opacity: 0.94 })); w.rotation.x = -Math.PI / 2; w.position.set(0, -1.1, 330); scn.add(w); }

    // zonas libres
    const libres = m.fases.map(f => [f.x, f.z, 16]).concat([[m.inicio[0], m.inicio[1], 10]]);
    if (m.fuerte) libres.push([m.fuerte[0], m.fuerte[1], 26]);
    const libre = (x, z, r) => libres.every(l => (x - l[0]) ** 2 + (z - l[1]) ** 2 > (l[2] - (r || 0)) ** 2) && Math.abs(x - pathX(z)) > 4.5;
    const punto = (r) => { for (let t = 0; t < 20; t++) { const x = (R() - 0.5) * 300, z = 268 - R() * 540; if (libre(x, z, r)) return [x, z]; } return null; };

    // rocas (3 formas, 2 tonos)
    const rocasGeo = [geoRoca(1.3), geoRoca(4.1), geoRoca(7.7)];
    const rocaMat = [mat(des ? 0xa8875e : 0x8e6e58, null, { flatShading: true }), mat(des ? 0x9a7f5d : 0x84796c, null, { flatShading: true })];
    const listas = [[], [], [], [], [], []];
    for (let i = 0; i < (des ? 130 : 420); i++) {
      const p = punto(); if (!p) continue; const [x, z] = p;
      const s = R() < 0.14 ? 1.3 + R() * 1.6 : 0.2 + R() * 0.75;
      listas[(i % 3) + 3 * (R() < 0.5 ? 0 : 1)].push(mtx(x, height(x, z) + s * 0.15, z, R() * 0.4, R() * 6, R() * 0.4, s * (0.9 + R() * 0.5), s * (0.7 + R() * 0.5), s * (0.9 + R() * 0.5)));
      if (s > 0.9) addCircle(x, z, s * 0.95);
    }
    listas.forEach((l, i) => instancias(scn, rocasGeo[i % 3], rocaMat[i < 3 ? 0 : 1], l, true, true));

    // hierba seca (esparto)
    const gH = new C.BufferGeometry();
    gH.setAttribute('position', new C.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0, 0, 0, -0.5, 0, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5], 3));
    gH.setAttribute('uv', new C.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1], 2));
    gH.setAttribute('normal', new C.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    gH.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    const hierba = [];
    for (let i = 0; i < (des ? 900 : 4200); i++) {
      const x = (R() - 0.5) * 300, z = 268 - R() * 540; if (pendiente(x, z) > 0.55) continue;
      const s = 0.4 + R() * 0.6; hierba.push(mtx(x, height(x, z) - 0.03, z, 0, R() * 6, 0, s * 1.2, s, s * 1.2));
    }
    const ih = instancias(scn, gH, new C.MeshLambertMaterial({ map: T.hierba, alphaTest: 0.5, side: C.DoubleSide, color: lin(des ? 0xe8d29a : 0xf0dca8) }), hierba, false, false); if (ih) ih.receiveShadow = false;

    if (!des) {
      // chumberas con higos
      const pads = [], higos = [];
      for (let i = 0; i < 90; i++) {
        const p = punto(); if (!p) continue; const [x, z] = p, y0 = height(x, z), k = 5 + Math.floor(R() * 5);
        for (let q = 0; q < k; q++) {
          const a = R() * 6.28, rr = q === 0 ? 0 : 0.3 + R() * 0.45, hy = q === 0 ? 0.45 : 0.6 + R() * 0.9, tilt = (R() - 0.5) * 0.9;
          pads.push(mtx(x + Math.cos(a) * rr, y0 + hy, z + Math.sin(a) * rr, tilt, a, (R() - 0.5) * 0.6, 0.36, 0.46, 0.08));
          if (R() < 0.5) higos.push(mtx(x + Math.cos(a) * rr, y0 + hy + 0.44, z + Math.sin(a) * rr, 0, 0, 0, 0.05, 0.065, 0.05));
        }
        addCircle(x, z, 0.75);
      }
      instancias(scn, new C.SphereGeometry(1, 9, 6), mat(0x6f8149), pads, true, false);
      instancias(scn, new C.SphereGeometry(1, 5, 4), mat(0xb4503a), higos, false, false);
      // euforbias en cojín (típicas del Anti-Atlas)
      const cols = [];
      for (let i = 0; i < 45; i++) {
        const p = punto(); if (!p) continue; const [x, z] = p, y0 = height(x, z), rad = 0.6 + R() * 0.8;
        for (let q = 0; q < 26; q++) { const a = R() * 6.28, r = Math.sqrt(R()) * rad, hh = (1 - (r / rad) ** 2) * (0.5 + rad * 0.5) + 0.15; cols.push(mtx(x + Math.cos(a) * r, y0 + hh / 2, z + Math.sin(a) * r, (R() - 0.5) * 0.2, 0, (R() - 0.5) * 0.2, 0.06, hh, 0.06)); }
        addCircle(x, z, rad * 0.8);
      }
      instancias(scn, new C.CylinderGeometry(1, 1, 1, 5), mat(0x7b8a55), cols, true, false);
      // arganes
      const tr = [], cr = [];
      for (let i = 0; i < 60; i++) {
        const p = punto(); if (!p) continue; const [x, z] = p, y0 = height(x, z), s = 0.8 + R() * 0.7;
        tr.push(mtx(x, y0 + 0.8 * s, z, (R() - 0.5) * 0.3, R() * 6, (R() - 0.5) * 0.3, s, s, s));
        tr.push(mtx(x + 0.3 * s, y0 + 1.5 * s, z, 0, R() * 6, 0.7, s * 0.6, s * 0.7, s * 0.6));
        for (let q = 0; q < 4; q++) cr.push(mtx(x + (R() - 0.5) * 2.2 * s, y0 + (1.9 + R() * 0.8) * s, z + (R() - 0.5) * 2.2 * s, R(), R() * 6, R(), (1.1 + R() * 0.8) * s, (0.6 + R() * 0.4) * s, (1.1 + R() * 0.8) * s));
        addCircle(x, z, 0.35);
      }
      instancias(scn, new C.CylinderGeometry(0.12, 0.2, 1.7, 6), mat(0x584330), tr, true, true);
      instancias(scn, geoRoca(2.2, 1), mat(0x515c35, null, { flatShading: true }), cr, true, false);
    } else {
      const mt = [];
      for (let i = 0; i < 80; i++) { const p = punto(); if (!p) continue; const [x, z] = p, s = 0.5 + R() * 0.9; mt.push(mtx(x, height(x, z) + s * 0.3, z, R(), R() * 6, R(), s * 1.4, s * 0.7, s * 1.4)); }
      instancias(scn, geoRoca(3.3, 1), mat(0x7f7d4c, null, { flatShading: true }), mt, true, false);
    }

    // palmeras datileras: palmeral junto al fuerte y sueltas por las vaguadas
    {
      const troncos = [], hojas = [], sitios = [];
      if (m.fuerte) for (let i = 0; i < 9; i++) { const a = R() * 6.28, r = 30 + R() * 16; sitios.push([m.fuerte[0] + Math.cos(a) * r, m.fuerte[1] + Math.sin(a) * r]); }
      for (let i = 0; i < (des ? 14 : 22); i++) { const p = punto(3); if (p) sitios.push(p); }
      for (const [x, z] of sitios) {
        if (!libre(x, z, 2)) continue;
        const y0 = height(x, z), alto = 4.5 + R() * 3.5, inc = (R() - 0.5) * 0.25, ay = R() * 6.28;
        for (let q = 0; q < 5; q++) { const t = (q + 0.5) / 5; troncos.push(mtx(x + Math.sin(ay) * inc * alto * t * t, y0 + alto * t, z + Math.cos(ay) * inc * alto * t * t, 0, R() * 6, 0, 1 - t * 0.35, alto / 5 + 0.05, 1 - t * 0.35)); }
        const cx = x + Math.sin(ay) * inc * alto, cz = z + Math.cos(ay) * inc * alto;
        for (let q = 0; q < 11; q++) { const a = q / 11 * 6.28 + R() * 0.3, cae = 0.35 + R() * 0.55; hojas.push(mtxY(cx + Math.sin(a) * 1.25 * Math.cos(cae), y0 + alto + 0.25 - Math.sin(cae) * 1.1, cz + Math.cos(a) * 1.25 * Math.cos(cae), cae, a, 0, 0.42, 0.05, 2.7)); }
        addCircle(x, z, 0.4);
      }
      instancias(scn, new C.CylinderGeometry(0.2, 0.24, 1, 7), mat(0x6e5a41), troncos, true, true);
      const gHoja = new C.SphereGeometry(0.5, 5, 6);
      instancias(scn, gHoja, mat(noche ? 0x39472b : 0x5d7036), hojas, true, false);
    }

    // casas encaladas de Sidi Ifni (estilo colonial, carpintería azul)
    if (m.mar) {
      const encalado = new C.MeshLambertMaterial({ color: lin(0xf1ece0), map: T.revoco }), azul = mat(0x2d5a80);
      for (let i = 0; i < 16; i++) {
        const x = -70 + i * 9 + (R() - 0.5) * 3; if (Math.abs(x) < 7) continue;
        const z = 222 + R() * 14, w = 5 + R() * 4, h = 3 + R() * 3, dd = 5 + R() * 3, y = height(x, z);
        caja(w, h + 2, dd, encalado, x, y + h / 2 - 1, z, 0, scn, true);
        caja(w + 0.3, 0.4, dd + 0.3, encalado, x, y + h + 0.2, z, 0, scn, false);
        caja(1, 2, 0.12, azul, x - w * 0.2, y + 1, z - dd / 2 - 0.03, 0, scn, false);
        caja(0.8, 0.9, 0.12, azul, x + w * 0.25, y + h * 0.6, z - dd / 2 - 0.03, 0, scn, false);
        addCircle(x, z, Math.max(w, dd) * 0.55);
      }
    }

    // posiciones: parapetos de piedra seca, sacos terreros, cobertura de emboscadas
    m.fases.forEach((f, i) => {
      const prev = i === 0 ? { x: m.inicio[0], z: m.inicio[1] } : m.fases[i - 1];
      if (f.tipo === 'take') f._spots = parapeto(scn, f, Math.atan2(prev.x - f.x, prev.z - f.z), R);
      else if (f.tipo === 'hold') sacos(scn, f, R);
      else if (f.tipo === 'ambush') {
        f._spots = [];
        for (let k = 0; k < f.n; k++) {
          const lado = k % 2 ? 1 : -1, x = f.x + lado * (28 + R() * 26), z = f.z + (R() - 0.5) * 70, s = 1.1 + R() * 0.6, rx = x - lado * 1.6;
          const r = new C.Mesh(rocasGeo[k % 3], rocaMat[k % 2]); r.position.set(rx, height(rx, z) + s * 0.2, z); r.rotation.set(R(), R() * 6, R()); r.scale.set(s * 1.4, s, s * 1.2);
          r.castShadow = r.receiveShadow = true; scn.add(r); r.updateMatrixWorld(); blockers.push(r); addCircle(rx, z, s);
          f._spots.push({ x, z, yaw: Math.atan2(lado, 0) });
        }
      }
    });
    instancias(scn, new C.DodecahedronGeometry(1, 0), mat(des ? 0xa68b67 : 0x8f7f6a, null, { flatShading: true }), piedras, true, false);
    instancias(scn, new C.SphereGeometry(1, 8, 5), mat(0xb39a6c), sacosL, true, false);
    if (m.fuerte) fuerte(scn, m.fuerte[0], m.fuerte[1]);

    refs = { sun, hemi, flare, terr, solDir };
    return refs;
  }

  function sierra(scn, Rr, alto, color, horizonte, sem) {
    const n = 160, p = [], c = [], idx = [], cTop = new C.Color(color), cBot = horizonte.clone(), t = new C.Color();
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2, h = alto * (0.25 + fbm(Math.cos(a) * 2.5 + sem, Math.sin(a) * 2.5 + sem) * 1.1);
      p.push(Math.cos(a) * Rr, h, Math.sin(a) * Rr, Math.cos(a) * Rr, -40, Math.sin(a) * Rr);
      t.copy(cTop).convertSRGBToLinear(); c.push(t.r, t.g, t.b); t.copy(cBot).lerp(cTop, 0.3).convertSRGBToLinear(); c.push(t.r, t.g, t.b);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new C.BufferGeometry(); g.setAttribute('position', new C.Float32BufferAttribute(p, 3)); g.setAttribute('color', new C.Float32BufferAttribute(c, 3)); g.setIndex(idx);
    scn.add(new C.Mesh(g, new C.MeshBasicMaterial({ vertexColors: true, fog: false, side: C.DoubleSide })));
  }

  // muro de piedra seca: bloque invisible para balas + piedras apiladas visibles
  function muroPiedra(scn, cx, cz, largo, alto, grueso, ang, R) {
    const y = height(cx, cz);
    bloqueInvisible(scn, largo, alto + 0.4, grueso, cx, y + alto / 2 - 0.2, cz, ang);
    const tx = Math.cos(ang), tz = -Math.sin(ang);
    const filas = Math.round(alto / 0.3);
    for (let f = 0; f < filas; f++) {
      const n = Math.round(largo / 0.5), desf = f % 2 ? 0.25 : 0;
      for (let i = 0; i < n; i++) {
        const o = -largo / 2 + (i + 0.5) * largo / n + desf * (i === n - 1 ? 0 : 1) * 0.5;
        for (const lado of [-0.22, 0.22]) {
          const nx = Math.sin(ang) * lado, nz = Math.cos(ang) * lado;
          piedras.push(mtx(cx + tx * o + nx, y + 0.12 + f * 0.3 + R() * 0.04, cz + tz * o + nz, R() * 0.5, ang + R() * 0.6, R() * 0.5, 0.28 + R() * 0.08, 0.17 + R() * 0.05, 0.24 + R() * 0.06));
        }
      }
    }
    const nc = Math.max(1, Math.round(largo / 1.1));
    for (let i = 0; i < nc; i++) { const o = (i + 0.5) / nc * largo - largo / 2; addCircle(cx + tx * o, cz + tz * o, grueso * 0.75); }
  }
  function parapeto(scn, f, face, R) {
    const spots = [], Rr = 10; let k = 0;
    for (let a = face - 1.3; a <= face + 1.31; a += 0.29, k++) {
      if (k > 1 && R() < 0.12) continue; // portillos
      muroPiedra(scn, f.x + Math.sin(a) * Rr, f.z + Math.cos(a) * Rr, 3.2, 1.15, 0.8, a, R);
      if (k % 2 === 0) spots.push({ x: f.x + Math.sin(a) * (Rr - 1.3), z: f.z + Math.cos(a) * (Rr - 1.3), yaw: a + Math.PI, muro: true });
    }
    // casamata de piedra con techo de vigas
    const y = height(f.x, f.z), cx = f.x - Math.sin(face) * 2, cz = f.z - Math.cos(face) * 2;
    caja(4.2, 3, 3.2, new C.MeshLambertMaterial({ color: lin(0x8a7660), map: tex().revoco }), cx, y + 0.9, cz, face, scn, true);
    caja(4.8, 0.22, 3.8, mat(0x4f3f2c), cx, y + 2.45, cz, face, scn, false);
    caja(1, 1.6, 0.1, mat(0x1d1710), cx + Math.sin(face) * 1.62, y + 0.8, cz + Math.cos(face) * 1.62, face, scn, false);
    addCircle(cx, cz, 2.2);
    for (let i = 0; i < 4; i++) { const a = face + (i - 1.5) * 0.6; spots.push({ x: f.x + Math.sin(a) * 5.5, z: f.z + Math.cos(a) * 5.5, yaw: a + Math.PI, muro: false }); }
    return spots;
  }
  function sacos(scn, f, R) {
    for (let i = -6; i <= 6; i++) {
      if (i === 0) continue;
      const x = f.x + i * 2.1, z = f.z - 5 + Math.abs(i) * 0.25, y = height(x, z);
      bloqueInvisible(scn, 2.2, 1.45, 0.9, x, y + 0.5, z, 0);
      for (let fl = 0; fl < 4; fl++) for (let s = 0; s < 3; s++) {
        sacosL.push(mtx(x - 0.7 + s * 0.7 + (fl % 2) * 0.3 - 0.15, y + 0.13 + fl * 0.26, z + (R() - 0.5) * 0.06, 0, (R() - 0.5) * 0.15, 0, 0.38, 0.14, 0.27));
      }
      addCircle(x - 0.55, z, 0.65); addCircle(x + 0.55, z, 0.65);
    }
  }
  function fuerte(scn, fx, fz) {
    const L = 30, H = 4.6, h = L / 2;
    const cal = new C.MeshLambertMaterial({ color: lin(0xece5d3), map: tex().revoco }), zocalo = mat(0xa8957a), almenas = [];
    const lado = (x0, z0, x1, z1, hueco) => {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n; if (hueco && Math.abs(t - 0.5) < 0.08) continue;
        const cx = x0 + (x1 - x0) * t, cz = z0 + (z1 - z0) * t, a = Math.atan2(-(z1 - z0), x1 - x0), y = height(cx, cz);
        caja(L / n + 0.1, H + 2, 1, cal, cx, y + H / 2 - 1, cz, a, scn, true);
        caja(L / n + 0.12, 0.8, 1.06, zocalo, cx, y + 0.1, cz, a, scn, false);
        for (let q = 0; q < 2; q++) { const o = (q - 0.5) * (L / n) * 0.5; almenas.push(mtx(cx + Math.cos(a) * o, y + H + 1.25, cz - Math.sin(a) * o, 0, a, 0, 0.9, 0.5, 1)); }
        addCircle(cx, cz, 2.3);
      }
    };
    lado(fx - h, fz + h, fx + h, fz + h, true); lado(fx - h, fz - h, fx + h, fz - h); lado(fx - h, fz - h, fx - h, fz + h); lado(fx + h, fz - h, fx + h, fz + h);
    instancias(scn, new C.BoxGeometry(1, 1, 1), cal, almenas, true, false);
    [[-h, -h], [h, -h], [-h, h], [h, h]].forEach(([dx, dz]) => { const y = height(fx + dx, fz + dz); caja(4.5, 8, 4.5, cal, fx + dx, y + 3, fz + dz, 0, scn, true); caja(4.9, 0.4, 4.9, zocalo, fx + dx, y + 7.1, fz + dz, 0, scn, false); addCircle(fx + dx, fz + dz, 3); });
    if (M.nido) { // adarve de madera tras la muralla norte para la ametralladora y los tiradores
      const ya = height(fx, fz - h + 1.7);
      caja(L - 2, 0.3, 2.4, mat(0x6b5236), fx, ya + 4.25, fz - h + 1.7, 0, scn, false);
      for (let i = -3; i <= 3; i++) caja(0.25, 4.2, 0.25, mat(0x4f3f2c), fx + i * 4, ya + 2.1, fz - h + 2.7, 0, scn, false);
    }
    const y = height(fx, fz);
    caja(10, 5, 7, cal, fx, y + 1.8, fz - 4, 0, scn, true); addCircle(fx, fz - 4, 5);
    const asta = new C.Mesh(new C.CylinderGeometry(0.06, 0.06, 9, 6), mat(0x444444)); asta.position.set(fx + h, height(fx + h, fz + h) + 11, fz + h); scn.add(asta);
    const bg = new C.PlaneGeometry(2.4, 1.6, 12, 4);
    const ban = new C.Mesh(bg, new C.MeshLambertMaterial({ map: tex().bandera, side: C.DoubleSide }));
    ban.position.set(fx + h + 1.2, asta.position.y + 3.6, fz + h); scn.add(ban); refs.bandera = ban;
  }

  // ---------- soldados articulados ----------
  const GEO = {};
  function geo() {
    if (GEO.muslo) return GEO;
    GEO.muslo = new C.CylinderGeometry(0.085, 0.072, 0.46, 8); GEO.muslo.translate(0, -0.23, 0);
    GEO.pierna = new C.CylinderGeometry(0.07, 0.058, 0.44, 8); GEO.pierna.translate(0, -0.22, 0);
    GEO.bota = new C.BoxGeometry(0.12, 0.11, 0.27); GEO.bota.translate(0, -0.47, -0.04);
    GEO.alpargata = new C.BoxGeometry(0.1, 0.05, 0.25); GEO.alpargata.translate(0, -0.47, -0.04);
    GEO.torso = new C.CylinderGeometry(0.21, 0.17, 0.58, 10); GEO.torso.scale(1, 1, 0.62);
    GEO.brazo = new C.CylinderGeometry(0.062, 0.055, 0.31, 7); GEO.brazo.translate(0, -0.155, 0);
    GEO.antebrazo = new C.CylinderGeometry(0.052, 0.042, 0.29, 7); GEO.antebrazo.translate(0, -0.145, 0);
    GEO.mano = new C.SphereGeometry(0.048, 6, 5); GEO.mano.translate(0, -0.31, 0);
    GEO.cabeza = new C.SphereGeometry(0.112, 12, 10); GEO.cabeza.scale(0.92, 1.08, 1);
    GEO.cuello = new C.CylinderGeometry(0.05, 0.055, 0.1, 7);
    GEO.chilaba = new C.CylinderGeometry(0.2, 0.34, 1.08, 12, 1, true);
    GEO.capucha = new C.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
    GEO.turbante = new C.TorusGeometry(0.105, 0.045, 6, 12);
    GEO.gorrillo = new C.CylinderGeometry(0.11, 0.125, 0.1, 10); GEO.gorrillo.scale(0.8, 1, 1.15);
    GEO.casco = new C.SphereGeometry(0.155, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    GEO.borla = new C.SphereGeometry(0.028, 6, 5);
    GEO.caja = new C.BoxGeometry(1, 1, 1);
    return GEO;
  }
  // soldado con el modelo esculpido y esqueleto (si está cargado); si no, el modelo sencillo
  function soldado(team, k) {
    if (typeof Humanos !== 'undefined' && Humanos.listo) {
      const h = team === 'L' ? Humanos.legionario(k) : Humanos.enemigo(k), B = h.B, g = h.g; g.rotation.order = 'YXZ';
      const arma = new C.Group(); g.add(arma);
      const madera = mat(0x6a4426), hierro = mat(0x2a2a2a, 'phong', { shininess: 40 }), Gm = geo();
      const pz = (m, x, y, z, sx, sy, sz) => { const o = new C.Mesh(Gm.caja, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; arma.add(o); };
      pz(madera, 0, 0, 0.02, 0.045, 0.06, 0.66); pz(madera, 0, -0.035, 0.4, 0.045, 0.1, 0.2); pz(madera, 0, -0.05, 0.52, 0.048, 0.125, 0.1);
      const cil = (m, r, l, y, z) => { const o = new C.Mesh(Gm.canon || (Gm.canon = new C.CylinderGeometry(1, 1, 1, 7).rotateX(Math.PI / 2)), m); o.position.set(0, y, z); o.scale.set(r, r, l); o.castShadow = true; arma.add(o); };
      cil(hierro, 0.012, 0.62, 0.03, -0.46); cil(hierro, 0.02, 0.2, 0.035, 0.1); pz(hierro, 0.035, 0.04, 0.12, 0.05, 0.012, 0.012); pz(hierro, 0, 0.05, -0.74, 0.006, 0.025, 0.012); pz(hierro, 0, -0.045, 0.12, 0.012, 0.05, 0.1);
      return { g, cadera: B.cadera, torso: B.columna, cabeza: B.cabeza, legL: B.musloI, legR: B.musloD, rodL: B.piernaI, rodR: B.piernaD, armL: B.brazoI, armR: B.brazoD, codoL: B.antebrazoI, codoR: B.antebrazoD, arma, humano: true };
    }
    const Gm = geo(), g = new C.Group(); g.rotation.order = 'YXZ';
    const L = team === 'L';
    const pielC = (L ? [0xd8a984, 0xc4946c, 0xb98860] : [0x9c6c4a, 0x875a3a, 0xa87754])[k % 3];
    const uniC = L ? [0x7a7350, 0x726c49, 0x807854][k % 3] : [0x8d7b62, 0x6e6352, 0xbcae90, 0x5a5046, 0x9c8a6c][k % 5];
    const piel = mat(pielC), uni = mat(uniC), cuero = mat(0x5a3f25);
    const add = (geo_, m, padre, x, y, z, sx, sy, sz) => { const o = new C.Mesh(geo_, m); o.position.set(x || 0, y || 0, z || 0); if (sx) o.scale.set(sx, sy, sz); o.castShadow = true; (padre || g).add(o); return o; };
    const cadera = new C.Group(); cadera.position.y = 0.95; g.add(cadera);
    const pierna = (x) => {
      const p = new C.Group(); p.position.set(x, 0, 0); cadera.add(p);
      add(Gm.muslo, L ? uni : mat(0x40362b), p);
      const rod = new C.Group(); rod.position.y = -0.46; p.add(rod);
      add(Gm.pierna, L ? mat(0x6a6446) : mat(0x40362b), rod);
      add(L ? Gm.bota : Gm.alpargata, L ? mat(0x2a2118) : mat(0x6a5236), rod);
      if (L) add(Gm.caja, mat(0x8a8466), rod, 0, -0.33, 0, 0.15, 0.16, 0.15); // polainas
      return { p, rod };
    };
    const pl = pierna(-0.1), pr = pierna(0.1);
    const torso = new C.Group(); torso.position.y = 0.95; g.add(torso);
    add(Gm.torso, uni, torso, 0, 0.3, 0);
    if (L) {
      add(Gm.caja, piel, torso, 0, 0.5, -0.115, 0.12, 0.12, 0.02);                // camisa abierta, pecho al aire
      add(Gm.caja, cuero, torso, 0, 0.02, 0, 0.42, 0.08, 0.28);                   // cinturón
      add(Gm.caja, cuero, torso, -0.11, 0.06, -0.135, 0.11, 0.1, 0.06);           // cartucheras
      add(Gm.caja, cuero, torso, 0.11, 0.06, -0.135, 0.11, 0.1, 0.06);
      const t = add(Gm.caja, cuero, torso, 0, 0.32, 0, 0.05, 0.62, 0.3); t.rotation.z = 0.55; // tirante
      add(Gm.caja, mat(0x5d5a3c), torso, 0.16, 0.08, 0.1, 0.1, 0.16, 0.1);        // cantimplora
    } else {
      add(Gm.chilaba, uni, g, 0, 0.78, 0).material = mat(uniC, null, { side: C.DoubleSide });
      const b = add(Gm.caja, mat(0x4b3a24), torso, 0, 0.32, 0, 0.06, 0.66, 0.3); b.rotation.z = -0.6; // canana
      if (k % 3 === 0) add(Gm.caja, mat(0x3c3226), torso, 0, 0.32, 0, 0.4, 0.42, 0.27);             // chaleco
    }
    add(Gm.cuello, piel, torso, 0, 0.63, 0);
    const cabeza = new C.Group(); cabeza.position.y = 0.73; torso.add(cabeza);
    add(Gm.cabeza, piel, cabeza);
    add(Gm.caja, piel, cabeza, 0, -0.01, -0.105, 0.025, 0.045, 0.03);  // nariz
    add(Gm.caja, mat(0x1a1410), cabeza, -0.04, 0.025, -0.1, 0.022, 0.012, 0.01);
    add(Gm.caja, mat(0x1a1410), cabeza, 0.04, 0.025, -0.1, 0.022, 0.012, 0.01);
    if (L) {
      if (k % 3 === 2) add(Gm.casco, mat(0x535a3e), cabeza, 0, 0.02, 0);
      else { add(Gm.gorrillo, mat(0x3c4a33), cabeza, 0, 0.115, 0); const b = add(Gm.borla, mat(0xb3261e), cabeza, 0, 0.12, -0.14); b.scale.y = 1.3; } // gorrillo con borla roja
    } else {
      const col = [0xece4d0, 0xd2c6a8, 0x6b5c45][k % 3];
      if (k % 4 === 3) add(Gm.capucha, uni, cabeza, 0, 0.0, 0.01).rotation.x = -0.3;
      else { const t = add(Gm.turbante, mat(col), cabeza, 0, 0.07, 0); t.rotation.x = Math.PI / 2; add(Gm.cabeza, mat(col), cabeza, 0, 0.1, 0, 0.85, 0.5, 0.9); }
      if (k % 2) add(Gm.caja, mat(0x221a12), cabeza, 0, -0.07, -0.08, 0.14, 0.07, 0.05); // barba
    }
    const brazo = (x) => {
      const p = new C.Group(); p.position.set(x, 0.55, 0); torso.add(p);
      add(Gm.brazo, uni, p);
      const codo = new C.Group(); codo.position.y = -0.31; p.add(codo);
      add(Gm.antebrazo, L ? piel : uni, codo); // remangado en la Legión
      add(Gm.mano, piel, codo);
      return { p, codo };
    };
    const bl = brazo(-0.25), br = brazo(0.25);
    // fusil
    const arma = new C.Group(); g.add(arma);
    const madera = mat(0x6a4426), hierro = mat(0x2a2a2a, 'phong', { shininess: 40 });
    add(Gm.caja, madera, arma, 0, 0, 0.08, 0.05, 0.07, 0.78);
    add(Gm.caja, madera, arma, 0, -0.05, 0.47, 0.055, 0.13, 0.22);
    add(Gm.caja, hierro, arma, 0, 0.035, -0.5, 0.025, 0.025, 0.5);
    add(Gm.caja, hierro, arma, 0, 0.05, 0.12, 0.04, 0.04, 0.16);
    return { g, cadera, torso, cabeza, legL: pl.p, legR: pr.p, rodL: pl.rod, rodR: pr.rod, armL: bl.p, armR: br.p, codoL: bl.codo, codoR: br.codo, arma };
  }

  // carro ligero M-24 Chaffee: barcaza, torre giratoria y cañón de 75 mm
  function carro() {
    const g = new C.Group(), verde = mat(0x5b6040), oscuro = mat(0x2a2b26), goma = mat(0x1c1c1a), acero = mat(0x3a3d36, 'phong', { shininess: 30 });
    const caj = (w, h, d, m, x, y, z, p, rx) => { const o = new C.Mesh(new C.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (rx) o.rotation.x = rx; o.castShadow = o.receiveShadow = true; p.add(o); return o; };
    const barcaza = new C.Group(); g.add(barcaza);
    caj(2.3, 0.75, 5.0, verde, 0, 1.15, 0.1, barcaza);
    caj(2.3, 0.6, 1.5, verde, 0, 0.98, -2.55, barcaza, -0.55);
    caj(2.2, 0.5, 1.0, verde, 0, 0.9, 2.75, barcaza, 0.5);
    caj(2.9, 0.08, 5.3, verde, 0, 1.36, 0.1, barcaza);
    for (const lado of [-1, 1]) {
      caj(0.48, 0.7, 5.5, oscuro, lado * 1.22, 0.55, 0.05, barcaza);
      for (let i = 0; i < 5; i++) { const r = new C.Mesh(new C.CylinderGeometry(0.34, 0.34, 0.5, 12), goma); r.rotation.z = Math.PI / 2; r.position.set(lado * 1.24, 0.36, -1.95 + i * 0.98); r.castShadow = true; barcaza.add(r); const t = new C.Mesh(new C.CylinderGeometry(0.15, 0.15, 0.53, 8), acero); t.rotation.z = Math.PI / 2; t.position.copy(r.position); barcaza.add(t); }
      for (const z of [-2.75, 2.75]) { const r = new C.Mesh(new C.CylinderGeometry(0.3, 0.3, 0.5, 10), acero); r.rotation.z = Math.PI / 2; r.position.set(lado * 1.24, 0.72, z); barcaza.add(r); }
      caj(0.14, 0.14, 0.14, mat(0xe9e2c8), lado * 0.8, 1.33, -2.75, barcaza);
    }
    caj(0.5, 0.35, 0.7, oscuro, -0.7, 1.55, 2.2, barcaza); caj(0.5, 0.35, 0.7, oscuro, 0.7, 1.55, 2.2, barcaza);
    const torre = new C.Group(); torre.position.set(0, 1.55, -0.35); g.add(torre);
    const cuerpo = new C.Mesh(new C.CylinderGeometry(0.98, 1.12, 0.72, 10), verde); cuerpo.position.y = 0.36; cuerpo.scale.z = 1.25; cuerpo.castShadow = true; torre.add(cuerpo);
    caj(1.5, 0.6, 0.9, verde, 0, 0.36, 1.45, torre);
    const cup = new C.Mesh(new C.CylinderGeometry(0.34, 0.38, 0.22, 10), verde); cup.position.set(0.42, 0.83, 0.3); torre.add(cup);
    const cunaG = new C.Group(); cunaG.position.set(0, 0.4, -1.15); torre.add(cunaG);
    caj(0.75, 0.6, 0.5, verde, 0, 0, 0, cunaG);
    const tubo = new C.Mesh(new C.CylinderGeometry(0.058, 0.07, 2.7, 10), acero); tubo.rotation.x = Math.PI / 2; tubo.position.z = -1.55; tubo.castShadow = true; cunaG.add(tubo);
    const coax = new C.Mesh(new C.CylinderGeometry(0.02, 0.02, 0.5, 6), oscuro); coax.rotation.x = Math.PI / 2; coax.position.set(0.24, 0.02, -0.4); cunaG.add(coax);
    const am = new C.Mesh(new C.CylinderGeometry(0.025, 0.025, 1.2, 6), oscuro); am.rotation.x = Math.PI / 2; am.position.set(-0.3, 1.05, 0.5); torre.add(am);
    const ant = new C.Mesh(new C.CylinderGeometry(0.008, 0.012, 2.4, 4), oscuro); ant.position.set(-0.6, 1.9, 1.5); torre.add(ant);
    return { g, barcaza, torre, cuna: cunaG, boca: new C.Vector3(0, 0, -2.95) };
  }

  function avion() {
    const g = new C.Group(), gris = mat(0x667060, 'phong', { shininess: 30 }), oscuro = mat(0x2b2f28), cristal = mat(0x9fb3bb, 'phong', { shininess: 90 });
    const f = new C.Mesh(new C.CylinderGeometry(0.95, 0.4, 16, 12), gris); f.rotation.x = Math.PI / 2; g.add(f);
    const morro = new C.Mesh(new C.SphereGeometry(0.95, 12, 8), cristal); morro.position.z = -8; morro.scale.z = 1.4; g.add(morro);
    const ala = new C.Mesh(new C.BoxGeometry(22, 0.3, 3.2), gris); ala.position.z = -1.5; g.add(ala);
    const cola = new C.Mesh(new C.BoxGeometry(7, 0.2, 1.8), gris); cola.position.z = 7.2; g.add(cola);
    const deriva = new C.Mesh(new C.BoxGeometry(0.2, 2.6, 2), gris); deriva.position.set(0, 1.2, 7.3); g.add(deriva);
    [-4.5, 4.5].forEach(x => { const mo = new C.Mesh(new C.CylinderGeometry(0.6, 0.48, 3.8, 10), oscuro); mo.rotation.x = Math.PI / 2; mo.position.set(x, -0.2, -2.6); g.add(mo); const h = new C.Mesh(new C.CircleGeometry(1.5, 16), new C.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.25 })); h.position.set(x, -0.2, -4.6); g.add(h); });
    return g;
  }

  return { build, height, pathX, obstaculo, colisiona, coberturaCerca, soldado, avion, carro, tex, rng, lin, mat, get refs() { return refs; } };
})();
