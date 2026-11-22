// Mundo 3D: terreno procedural del Anti-Atlas / Sáhara, vegetación, parapetos, fuerte, soldados y avión.
const World = (() => {
  const C = THREE;
  let M = null, seed = 1;
  const mats = {};
  function mat(c, extra) {
    const k = c + (extra ? JSON.stringify(extra) : '');
    return mats[k] || (mats[k] = new C.MeshLambertMaterial(Object.assign({ color: c }, extra || {})));
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

  // ---------- colisiones (círculos en rejilla) y obstáculos para balas ----------
  const CELL = 8, grid = new Map(), blockers = [];
  function addCircle(x, z, r) {
    const c = { x, z, r };
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
  const ray = new C.Raycaster();
  // distancia hasta el primer obstáculo (cobertura o terreno) a lo largo de dir (normalizado)
  function obstaculo(o, dir, maxD) {
    ray.set(o, dir); ray.far = maxD;
    const hits = ray.intersectObjects(blockers, false);
    let d = hits.length ? hits[0].distance : maxD;
    for (let t = 1.5; t < d; t += 2) {
      if (o.y + dir.y * t < height(o.x + dir.x * t, o.z + dir.z * t)) return Math.max(0, t - 1);
    }
    return d;
  }

  function caja(w, h, d, color, x, y, z, ry, scn, bloquea) {
    const m = new C.Mesh(new C.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z); m.rotation.y = ry || 0; m.castShadow = true; m.receiveShadow = true;
    scn.add(m); if (bloquea) blockers.push(m);
    return m;
  }
  // muro de piedra/sacos con colisión a lo largo
  function muro(scn, cx, cz, largo, alto, grueso, ang, color) {
    const y = height(cx, cz);
    caja(largo, alto + 0.4, grueso, color, cx, y + alto / 2 - 0.2, cz, ang, scn, true);
    const tx = Math.cos(ang), tz = -Math.sin(ang), n = Math.max(1, Math.round(largo / 1.1));
    for (let i = 0; i < n; i++) { const o = (i + 0.5) / n * largo - largo / 2; addCircle(cx + tx * o, cz + tz * o, grueso * 0.75); }
  }

  function texturaCanvas(w, h, pinta) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; pinta(c.getContext('2d'), w, h);
    const t = new C.CanvasTexture(c); return t;
  }
  const TEX = {};
  function tex() {
    if (TEX.humo) return TEX;
    TEX.humo = texturaCanvas(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
    TEX.fogon = texturaCanvas(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,250,220,1)'); r.addColorStop(0.3, 'rgba(255,200,80,.9)'); r.addColorStop(1, 'rgba(255,120,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
    TEX.marca = texturaCanvas(64, 64, (g) => { g.fillStyle = '#f2b90f'; g.strokeStyle = '#1d1710'; g.lineWidth = 5; g.beginPath(); g.moveTo(8, 10); g.lineTo(56, 10); g.lineTo(32, 54); g.closePath(); g.stroke(); g.fill(); });
    TEX.bandera = texturaCanvas(96, 64, (g) => { g.fillStyle = '#c60b1e'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#ffc400'; g.fillRect(0, 16, 96, 32); });
    return TEX;
  }

  // ---------- construcción del escenario ----------
  let refs = {};
  function build(m, scn) {
    M = m; seed = m.seed; grid.clear(); blockers.length = 0;
    const R = rng(seed), noche = !!m.noche, des = !!m.desierto;
    const skyCol = noche ? 0x0d1628 : des ? 0xdccfb2 : 0xc9d4d4;
    scn.background = new C.Color(skyCol);
    scn.fog = new C.Fog(skyCol, noche ? 30 : 80, noche ? 190 : 360);

    // bóveda celeste con degradado
    const sg = new C.SphereGeometry(480, 24, 12), sc = [], top = new C.Color(noche ? 0x03060f : des ? 0x8fb0c8 : 0x6f9cc0), hor = new C.Color(skyCol), tc = new C.Color();
    for (let i = 0; i < sg.attributes.position.count; i++) { const y = sg.attributes.position.getY(i) / 480; tc.copy(hor).lerp(top, Math.min(1, Math.max(0, y * 2.2))); sc.push(tc.r, tc.g, tc.b); }
    sg.setAttribute('color', new C.Float32BufferAttribute(sc, 3));
    const sky = new C.Mesh(sg, new C.MeshBasicMaterial({ vertexColors: true, side: C.BackSide, fog: false, depthWrite: false }));
    scn.add(sky);
    if (noche) { // estrellas
      const sp = []; for (let i = 0; i < 700; i++) { const a = R() * Math.PI * 2, e = 0.12 + R() * 1.3; sp.push(Math.cos(a) * Math.cos(e) * 450, Math.sin(e) * 450, Math.sin(a) * Math.cos(e) * 450); }
      const g = new C.BufferGeometry(); g.setAttribute('position', new C.Float32BufferAttribute(sp, 3));
      scn.add(new C.Points(g, new C.PointsMaterial({ color: 0xdfe6ff, size: 1.3, sizeAttenuation: false, fog: false })));
    }

    // luces
    const hemi = new C.HemisphereLight(noche ? 0x5a6c95 : 0xfff2dc, noche ? 0x1c1a22 : 0x8a6842, noche ? 0.62 : 0.6);
    scn.add(hemi);
    const sun = new C.DirectionalLight(noche ? 0xa8bce6 : 0xfff0d6, noche ? 0.42 : 0.82);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    const sh = sun.shadow.camera; sh.left = -45; sh.right = 45; sh.top = 45; sh.bottom = -45; sh.near = 1; sh.far = 260; sun.shadow.bias = -0.0008;
    scn.add(sun); scn.add(sun.target);
    const flare = new C.PointLight(0xfff1c8, 0, 280, 1.6); scn.add(flare);

    // terreno
    const S = 640, N = 160, g = new C.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), cc = new C.Color(), tmp = new C.Color();
    const base = des ? new C.Color(0.74, 0.6, 0.42) : new C.Color(0.6, 0.47, 0.32);
    const roca = new C.Color(0.55, 0.49, 0.42), verde = new C.Color(0.47, 0.47, 0.28), pista = new C.Color(0.82, 0.7, 0.52), arenaM = new C.Color(0.62, 0.55, 0.42);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = height(x, z); pos.setY(i, y);
      const s = (Math.abs(height(x + 2, z) - height(x - 2, z)) + Math.abs(height(x, z + 2) - height(x, z - 2))) / 4;
      const n = fbm(x * 0.09, z * 0.09);
      cc.copy(base).multiplyScalar(0.84 + 0.3 * n);
      if (!des) {
        if (s > 0.35) cc.lerp(roca, Math.min(1, (s - 0.35) * 2.2));
        if (fbm(x * 0.03 + 9, z * 0.03) > 0.6) cc.lerp(verde, 0.45);
        const dp = Math.abs(x - pathX(z)); if (dp < 3.5) cc.lerp(pista, 0.55 * (1 - dp / 3.5));
      } else {
        cc.lerp(tmp.setRGB(0.82, 0.68, 0.5), Math.max(0, Math.min(1, y * 0.12)));
      }
      if (m.mar && y < 0.4) cc.lerp(arenaM, 0.7);
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    g.setAttribute('color', new C.BufferAttribute(col, 3)); g.computeVertexNormals();
    const terr = new C.Mesh(g, new C.MeshLambertMaterial({ vertexColors: true })); terr.receiveShadow = true; scn.add(terr);
    if (m.mar) { const w = new C.Mesh(new C.PlaneGeometry(700, 160), new C.MeshLambertMaterial({ color: noche ? 0x16303e : 0x2f6476, transparent: true, opacity: 0.92 })); w.rotation.x = -Math.PI / 2; w.position.set(0, -1.1, 320); scn.add(w); }

    // zonas libres: alrededor de objetivos, inicio y pista
    const libres = m.fases.map(f => [f.x, f.z, 16]).concat([[m.inicio[0], m.inicio[1], 10]]);
    if (m.fuerte) libres.push([m.fuerte[0], m.fuerte[1], 26]);
    const libre = (x, z) => libres.every(l => (x - l[0]) ** 2 + (z - l[1]) ** 2 > l[2] * l[2]) && Math.abs(x - pathX(z)) > 4.5;

    // rocas
    const nR = des ? 120 : 380, rg = new C.DodecahedronGeometry(1, 0);
    const rocas = new C.InstancedMesh(rg, mat(des ? 0xa88a62 : 0x8a7b68), nR);
    const d = new C.Object3D(); let ir = 0;
    for (let t = 0; t < nR * 3 && ir < nR; t++) {
      const x = (R() - 0.5) * 300, z = 270 - R() * 540; if (!libre(x, z)) continue;
      const s = R() < 0.15 ? 1.2 + R() * 1.4 : 0.25 + R() * 0.8;
      d.position.set(x, height(x, z) + s * 0.25, z); d.rotation.set(R() * 3, R() * 3, R() * 3); d.scale.set(s * (0.8 + R() * 0.6), s * (0.6 + R() * 0.5), s * (0.8 + R() * 0.6)); d.updateMatrix();
      rocas.setMatrixAt(ir++, d.matrix); if (s > 0.9) addCircle(x, z, s * 0.85);
    }
    rocas.count = ir; rocas.castShadow = true; rocas.receiveShadow = true; scn.add(rocas); blockers.push(rocas);

    if (!des) {
      // chumberas (palas aplanadas)
      const nC = 95, pads = new C.InstancedMesh(new C.SphereGeometry(1, 7, 5), mat(0x6c7d48), nC * 7); let ip = 0;
      for (let t = 0; t < nC * 3 && ip < nC * 7 - 7; t++) {
        const x = (R() - 0.5) * 260, z = 260 - R() * 520; if (!libre(x, z)) continue;
        const y0 = height(x, z), k = 4 + Math.floor(R() * 4);
        for (let p = 0; p < k; p++) {
          const a = R() * 6.28, rr = p === 0 ? 0 : 0.35 + R() * 0.35, hy = p === 0 ? 0.45 : 0.7 + R() * 0.7;
          d.position.set(x + Math.cos(a) * rr, y0 + hy, z + Math.sin(a) * rr); d.rotation.set((R() - 0.5) * 0.8, a, (R() - 0.5) * 0.8); d.scale.set(0.38, 0.48, 0.09); d.updateMatrix(); pads.setMatrixAt(ip++, d.matrix);
        }
        addCircle(x, z, 0.7);
      }
      pads.count = ip; pads.castShadow = true; scn.add(pads);
      // arganes
      const nA = 55, tr = new C.InstancedMesh(new C.CylinderGeometry(0.13, 0.22, 1.7, 5), mat(0x5a4632), nA), cr = new C.InstancedMesh(new C.IcosahedronGeometry(1, 0), mat(0x56613b), nA * 2); let ia = 0, ic = 0;
      for (let t = 0; t < nA * 3 && ia < nA; t++) {
        const x = (R() - 0.5) * 280, z = 260 - R() * 520; if (!libre(x, z)) continue;
        const y0 = height(x, z), s = 0.8 + R() * 0.6;
        d.position.set(x, y0 + 0.85 * s, z); d.rotation.set(0, R() * 6, (R() - 0.5) * 0.3); d.scale.set(s, s, s); d.updateMatrix(); tr.setMatrixAt(ia++, d.matrix);
        for (let k = 0; k < 2; k++) { d.position.set(x + (R() - 0.5) * 1.2, y0 + (1.7 + R() * 0.6) * s, z + (R() - 0.5) * 1.2); d.rotation.set(R(), R() * 6, R()); d.scale.set((1.6 + R()) * s, (0.8 + R() * 0.4) * s, (1.6 + R()) * s); d.updateMatrix(); cr.setMatrixAt(ic++, d.matrix); }
        addCircle(x, z, 0.35);
      }
      tr.count = ia; cr.count = ic; tr.castShadow = cr.castShadow = true; scn.add(tr); scn.add(cr); blockers.push(tr);
    } else {
      // tarajes y matas del desierto
      const nT = 70, mt = new C.InstancedMesh(new C.IcosahedronGeometry(1, 0), mat(0x7a7a4a), nT); let it = 0;
      for (let t = 0; t < nT * 3 && it < nT; t++) {
        const x = (R() - 0.5) * 280, z = 260 - R() * 520; if (!libre(x, z)) continue;
        const s = 0.5 + R() * 0.9; d.position.set(x, height(x, z) + s * 0.4, z); d.rotation.set(R(), R() * 6, R()); d.scale.set(s * 1.4, s * 0.7, s * 1.4); d.updateMatrix(); mt.setMatrixAt(it++, d.matrix);
      }
      mt.count = it; mt.castShadow = true; scn.add(mt);
    }

    // casas encaladas de Sidi Ifni
    if (m.mar) {
      for (let i = 0; i < 16; i++) {
        const x = -70 + i * 9 + (R() - 0.5) * 3; if (Math.abs(x) < 7) continue;
        const z = 222 + R() * 14, w = 5 + R() * 4, h = 3 + R() * 3, dd = 5 + R() * 3, y = height(x, z);
        caja(w, h + 2, dd, 0xe9e4d8, x, y + h / 2 - 1, z, 0, scn, true);
        caja(1, 1.9, 0.1, 0x2d4f6b, x, y + 0.9, z - dd / 2 - 0.02, 0, scn, false);
        addCircle(x, z, Math.max(w, dd) * 0.55);
      }
    }

    // parapetos de las posiciones enemigas, sacos de las posiciones propias, cobertura de emboscadas
    m.fases.forEach((f, i) => {
      const prev = i === 0 ? { x: m.inicio[0], z: m.inicio[1] } : m.fases[i - 1];
      if (f.tipo === 'take') f._spots = parapeto(scn, f, Math.atan2(prev.x - f.x, prev.z - f.z), R);
      else if (f.tipo === 'hold') sacos(scn, f);
      else if (f.tipo === 'ambush') {
        f._spots = [];
        for (let k = 0; k < f.n; k++) {
          const lado = k % 2 ? 1 : -1, x = f.x + lado * (28 + R() * 26), z = f.z + (R() - 0.5) * 70, s = 1.1 + R() * 0.6;
          const rx = x - lado * 1.6;
          d.position.set(rx, height(rx, z) + s * 0.3, z); d.rotation.set(R(), R(), R()); d.scale.set(s * 1.3, s, s); d.updateMatrix();
          const r = new C.Mesh(rg, mat(des ? 0xa88a62 : 0x8a7b68)); r.applyMatrix4(d.matrix); r.castShadow = true; scn.add(r); blockers.push(r); addCircle(rx, z, s);
          f._spots.push({ x, z, yaw: Math.atan2(lado, 0) });
        }
      }
    });
    if (m.fuerte) fuerte(scn, m.fuerte[0], m.fuerte[1]);

    refs = { sun, hemi, flare, terr };
    return refs;
  }

  function parapeto(scn, f, face, R) {
    const spots = [], Rr = 10, piedra = [0x8c7d68, 0x7f715e, 0x96876f];
    let k = 0;
    for (let a = face - 1.3; a <= face + 1.31; a += 0.29, k++) {
      if (k > 1 && R() < 0.12) continue; // portillos
      const cx = f.x + Math.sin(a) * Rr, cz = f.z + Math.cos(a) * Rr;
      muro(scn, cx, cz, 3.2, 1.1 + R() * 0.15, 0.8, a, piedra[k % 3]);
      if (k % 2 === 0) spots.push({ x: f.x + Math.sin(a) * (Rr - 1.3), z: f.z + Math.cos(a) * (Rr - 1.3), yaw: a + Math.PI, muro: true });
    }
    // casamata de piedra en el centro
    const y = height(f.x, f.z);
    caja(4.2, 3, 3.2, 0x7a6c58, f.x, y + 0.9, f.z - 2, face, scn, true);
    caja(4.6, 0.25, 3.6, 0x5d5244, f.x, y + 2.45, f.z - 2, face, scn, false);
    addCircle(f.x, f.z - 2, 2.2);
    for (let i = 0; i < 4; i++) { const a = face + (i - 1.5) * 0.6; spots.push({ x: f.x + Math.sin(a) * 5, z: f.z + Math.cos(a) * 5, yaw: a + Math.PI, muro: false }); }
    return spots;
  }
  function sacos(scn, f) {
    for (let i = -6; i <= 6; i++) {
      if (i === 0) continue;
      const x = f.x + i * 2.1, z = f.z - 5 + Math.abs(i) * 0.25;
      muro(scn, x, z, 2.2, 1.05, 0.9, 0, 0xa8946b);
    }
  }
  function fuerte(scn, fx, fz) {
    const L = 30, H = 4.6, blanco = 0xe8e2d2;
    const lado = (x0, z0, x1, z1, hueco) => {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n; if (hueco && Math.abs(t - 0.5) < 0.08) continue;
        const cx = x0 + (x1 - x0) * t, cz = z0 + (z1 - z0) * t;
        const a = Math.atan2(-(z1 - z0), x1 - x0), y = height(cx, cz);
        caja(L / n + 0.1, H + 2, 1, blanco, cx, y + H / 2 - 1, cz, a, scn, true);
        addCircle(cx, cz, 2.3);
      }
    };
    const h = L / 2;
    lado(fx - h, fz + h, fx + h, fz + h, true); lado(fx - h, fz - h, fx + h, fz - h); lado(fx - h, fz - h, fx - h, fz + h); lado(fx + h, fz - h, fx + h, fz + h);
    [[-h, -h], [h, -h], [-h, h], [h, h]].forEach(([dx, dz]) => { const y = height(fx + dx, fz + dz); caja(4.5, 8, 4.5, 0xdcd5c3, fx + dx, y + 3, fz + dz, 0, scn, true); addCircle(fx + dx, fz + dz, 3); });
    const y = height(fx, fz);
    caja(10, 5, 7, 0xd8d0bd, fx, y + 1.8, fz - 4, 0, scn, true); addCircle(fx, fz - 4, 5);
    const asta = new C.Mesh(new C.CylinderGeometry(0.06, 0.06, 9, 5), mat(0x444444)); asta.position.set(fx + h, height(fx + h, fz + h) + 11, fz + h); scn.add(asta);
    const ban = new C.Mesh(new C.PlaneGeometry(2.4, 1.6), new C.MeshLambertMaterial({ map: tex().bandera, side: C.DoubleSide }));
    ban.position.set(fx + h + 1.2, asta.position.y + 3.6, fz + h); scn.add(ban); refs.bandera = ban;
  }

  // ---------- soldados ----------
  function soldado(team, k) {
    const g = new C.Group(); g.rotation.order = 'YXZ';
    const L = team === 'L';
    const piel = (L ? [0xd2a37c, 0xc0916a, 0xb58561] : [0x9c6c4a, 0x8a5c3c, 0xa87754])[k % 3];
    const uni = L ? [0x6e6c47, 0x666440, 0x737048][k % 3] : [0x8d7b62, 0x6e6352, 0xb5a78a, 0x5a5046, 0x9c8a6c][k % 5];
    const bota = L ? 0x2a2118 : 0x4a3a28;
    const parte = (geo, color, x, y, z, padre) => { const m = new C.Mesh(geo, mat(color)); m.position.set(x, y, z); m.castShadow = true; (padre || g).add(m); return m; };
    const pierna = (x) => { const p = new C.Group(); p.position.set(x, 0.92, 0); g.add(p); parte(new C.BoxGeometry(0.17, 0.82, 0.19), L ? uni : 0x3d342a, 0, -0.41, 0, p); parte(new C.BoxGeometry(0.18, 0.14, 0.28), bota, 0, -0.86, -0.04, p); return p; };
    const legL = pierna(-0.11), legR = pierna(0.11);
    const torso = parte(new C.BoxGeometry(0.46, 0.62, 0.27), uni, 0, 1.22, 0);
    if (L) {
      parte(new C.BoxGeometry(0.48, 0.09, 0.29), 0x5b4127, 0, 0.95, 0);
      parte(new C.BoxGeometry(0.07, 0.62, 0.29), 0x5b4127, 0.1, 1.24, 0).rotation.z = 0.5; // correaje
      parte(new C.BoxGeometry(0.3, 0.12, 0.08), 0x5b4127, 0, 1.0, -0.16); // cartucheras
    } else {
      parte(new C.CylinderGeometry(0.25, 0.37, 0.95, 8), uni, 0, 0.55, 0); // chilaba
      if (k % 3 === 0) parte(new C.BoxGeometry(0.47, 0.5, 0.28), 0x3c3226, 0, 1.25, 0); // chaleco
      parte(new C.BoxGeometry(0.06, 0.6, 0.29), 0x4b3a24, -0.1, 1.24, 0).rotation.z = -0.5; // canana
    }
    const brazo = (x) => { const p = new C.Group(); p.position.set(x, 1.47, 0); g.add(p); parte(new C.BoxGeometry(0.13, 0.6, 0.14), uni, 0, -0.28, 0, p); parte(new C.BoxGeometry(0.1, 0.1, 0.1), piel, 0, -0.6, 0, p); return p; };
    const armL = brazo(-0.3), armR = brazo(0.3);
    const head = parte(new C.SphereGeometry(0.12, 8, 6), piel, 0, 1.67, 0);
    if (L) {
      if (k % 3 === 2) { const c = parte(new C.SphereGeometry(0.16, 8, 6, 0, 6.3, 0, 1.6), 0x4d5238, 0, 1.7, 0); c.scale.y = 0.85; } // casco
      else { parte(new C.BoxGeometry(0.21, 0.09, 0.27), 0x3a4632, 0, 1.79, 0); parte(new C.SphereGeometry(0.03, 5, 4), 0xb3261e, 0, 1.79, -0.15); } // gorrillo con borla roja
    } else {
      parte(new C.CylinderGeometry(0.145, 0.14, 0.13, 8), [0xe8e0cc, 0xcfc3a5, 0x6b5c45][k % 3], 0, 1.76, 0); // turbante
      if (k % 4 === 1) parte(new C.BoxGeometry(0.2, 0.05, 0.05), 0x2a2018, 0, 1.6, -0.1); // barba
    }
    // arma
    const arma = new C.Group(); g.add(arma);
    parte(new C.BoxGeometry(0.05, 0.07, 0.75), 0x5a3a20, 0, 0, 0.05, arma);
    parte(new C.BoxGeometry(0.03, 0.03, 0.55), 0x252525, 0, 0.03, -0.55, arma);
    parte(new C.BoxGeometry(0.06, 0.12, 0.22), 0x4a2e18, 0, -0.05, 0.45, arma);
    return { g, legL, legR, armL, armR, torso, head, arma };
  }

  function avion() {
    const g = new C.Group(), gris = mat(0x5f6656), oscuro = mat(0x2b2f28);
    const f = new C.Mesh(new C.CylinderGeometry(0.9, 0.5, 16, 8), gris); f.rotation.x = Math.PI / 2; g.add(f);
    const morro = new C.Mesh(new C.SphereGeometry(0.9, 8, 6), mat(0x8fa0a8)); morro.position.z = -8; g.add(morro);
    const ala = new C.Mesh(new C.BoxGeometry(22, 0.3, 3.2), gris); ala.position.z = -1.5; g.add(ala);
    const cola = new C.Mesh(new C.BoxGeometry(7, 0.2, 1.8), gris); cola.position.z = 7.2; g.add(cola);
    const deriva = new C.Mesh(new C.BoxGeometry(0.2, 2.6, 2), gris); deriva.position.set(0, 1.2, 7.3); g.add(deriva);
    [-4.5, 4.5].forEach(x => { const mo = new C.Mesh(new C.CylinderGeometry(0.55, 0.45, 3.6, 8), oscuro); mo.rotation.x = Math.PI / 2; mo.position.set(x, -0.2, -2.6); g.add(mo); });
    return g;
  }

  return { build, height, pathX, obstaculo, colisiona, soldado, avion, tex, rng, get refs() { return refs; } };
})();
