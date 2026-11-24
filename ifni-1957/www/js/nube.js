// Nube: banderas (clanes) y copia del progreso en Firebase (Firestore por REST, sesión anónima).
// Se activa cuando js/entorno.js define window.IFNI_FIREBASE = { apiKey, projectId }. Sin eso el juego funciona igual, sin banderas.
const Nube = (() => {
  const C = window.IFNI_FIREBASE || null, activa = !!(C && C.apiKey && C.projectId);
  const AUT = (C && C.hostAuth) || 'https://identitytoolkit.googleapis.com', TOK = (C && C.hostToken) || 'https://securetoken.googleapis.com';
  const FS = ((C && C.hostFs) || 'https://firestore.googleapis.com') + '/v1/projects/' + (C ? C.projectId : '') + '/databases/(default)/documents/';
  let ses = null; try { ses = JSON.parse(localStorage.getItem('ifni_nube') || 'null'); } catch (e) {}
  const guardaSes = () => { try { localStorage.setItem('ifni_nube', JSON.stringify(ses)); } catch (e) {} };
  async function pide(url, op) {
    const r = await fetch(url, op), t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
    if (!r.ok) { const er = new Error((j && j.error && j.error.message) || ('HTTP ' + r.status)); er.estado = r.status; throw er; }
    return j;
  }
  async function token() {
    if (!activa) throw new Error('sin nube');
    if (ses && ses.exp > Date.now() + 60000) return ses.idToken;
    if (ses && ses.refreshToken) {
      try {
        const j = await pide(TOK + '/v1/token?key=' + C.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(ses.refreshToken) });
        ses = { uid: j.user_id, idToken: j.id_token, refreshToken: j.refresh_token, exp: Date.now() + (+j.expires_in || 3600) * 1000 }; guardaSes(); return ses.idToken;
      } catch (e) { ses = null; }
    }
    const j = await pide(AUT + '/v1/accounts:signUp?key=' + C.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
    ses = { uid: j.localId, idToken: j.idToken, refreshToken: j.refreshToken, exp: Date.now() + (+j.expiresIn || 3600) * 1000 }; guardaSes(); return ses.idToken;
  }
  // Firestore guarda cada valor con su tipo
  const cod = o => { const f = {}; for (const k in o) { const v = o[k]; f[k] = typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v == null ? '' : v) }; } return { fields: f }; };
  const dec = d => { const o = {}, f = (d && d.fields) || {}; for (const k in f) { const v = f[k]; o[k] = 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : v.stringValue; } if (d && d.name) o._id = d.name.split('/').pop(); return o; };
  const cab = async () => ({ Authorization: 'Bearer ' + (await token()), 'Content-Type': 'application/json' });
  async function lee(ruta) { try { return dec(await pide(FS + ruta, { headers: await cab() })); } catch (e) { if (e.estado === 404) return null; throw e; } }
  async function pon(ruta, o) { return dec(await pide(FS + ruta, { method: 'PATCH', headers: await cab(), body: JSON.stringify(cod(o)) })); }
  async function lista(ruta) { const j = await pide(FS + ruta + '?pageSize=60', { headers: await cab() }); return ((j && j.documents) || []).map(dec); }
  async function borra(ruta) { try { await pide(FS + ruta, { method: 'DELETE', headers: await cab() }); } catch (e) {} }

  // semana ISO: los puntos de la bandera se cuentan de lunes a domingo
  function semana(d) { d = d ? new Date(d) : new Date(); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dia = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dia); const y = t.getUTCFullYear(); return y + '-S' + String(Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7)).padStart(2, '0'); }
  const limpio = s => String(s || '').replace(/[<>&"']/g, '').trim().slice(0, 24);
  function ficha(P, puntos) { return { nombre: limpio(P.avatar.nombre) || 'Legionario', xp: P.xp | 0, semana: semana(), puntos: puntos | 0, av: JSON.stringify(P.avatar), arma: P.equipo.p, t: Date.now() }; }

  async function crearBandera(nombre, P) {
    nombre = limpio(nombre); if (nombre.length < 3) throw new Error('Pon un nombre de al menos 3 letras');
    await token();
    for (let i = 0; i < 6; i++) {
      const codigo = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
      if (await lee('banderas/' + codigo)) continue;
      await pon('banderas/' + codigo, { nombre, creador: ses.uid, creada: Date.now() });
      return unirse(codigo, P);
    }
    throw new Error('No se pudo crear la bandera');
  }
  async function unirse(codigo, P) {
    codigo = String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    const b = await lee('banderas/' + codigo); if (!b) throw new Error('No existe ninguna bandera con ese código');
    const mio = await lee('banderas/' + codigo + '/miembros/' + ses.uid);
    await pon('banderas/' + codigo + '/miembros/' + ses.uid, ficha(P, mio && mio.semana === semana() ? mio.puntos : 0));
    P.bandera = { codigo, nombre: b.nombre, semana: semana(), puntos: mio && mio.semana === semana() ? mio.puntos : 0 };
    return P.bandera;
  }
  async function salir(P) { if (!P.bandera) return; await token(); await borra('banderas/' + P.bandera.codigo + '/miembros/' + ses.uid); P.bandera = null; }
  // suma los puntos de una misión a la semana en curso
  async function sumar(P, puntos) {
    if (!activa || !P.bandera) return; const B = P.bandera;
    if (B.semana !== semana()) { B.semana = semana(); B.puntos = 0; }
    B.puntos += Math.max(0, puntos | 0);
    await token(); await pon('banderas/' + B.codigo + '/miembros/' + ses.uid, ficha(P, B.puntos));
  }
  async function miembros(P) {
    if (!P.bandera) return []; await token(); const s = semana();
    return (await lista('banderas/' + P.bandera.codigo + '/miembros')).map(m => ({ uid: m._id, nombre: limpio(m.nombre) || 'Legionario', xp: m.xp | 0, puntos: m.semana === s ? m.puntos | 0 : 0, av: (() => { try { return JSON.parse(m.av); } catch (e) { return null; } })(), arma: m.arma, yo: m._id === ses.uid }))
      .sort((a, b) => b.puntos - a.puntos || b.xp - a.xp);
  }
  // copia del progreso: una por jugador
  async function guardarProgreso(P) { if (!activa) return; await token(); await pon('usuarios/' + ses.uid, { perfil: JSON.stringify(P), t: Date.now() }); }
  async function leerProgreso() { await token(); const d = await lee('usuarios/' + ses.uid); if (!d || !d.perfil) return null; try { return JSON.parse(d.perfil); } catch (e) { return null; } }
  return { activa, semana, crearBandera, unirse, salir, sumar, miembros, guardarProgreso, leerProgreso, get uid() { return ses && ses.uid; } };
})();
