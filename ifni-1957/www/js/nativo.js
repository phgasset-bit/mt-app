// Integración nativa en Android: anuncios de Google (AdMob) y pagos de Google Play.
// En el navegador no hay nada nativo y el juego usa el modo de prueba (anuncios y compras simulados).
const Nativo = (() => {
  // Al publicar: poner aquí los identificadores reales de los bloques de anuncios de AdMob y pruebas: false.
  // El identificador de la app de AdMob va en el AndroidManifest (variable ADMOB_APP_ID de la compilación).
  const CONFIG = {
    anuncioRecompensado: 'ca-app-pub-3940256099942544/5224354917', // prueba oficial de Google
    anuncioIntersticial: 'ca-app-pub-3940256099942544/1033173712', // prueba oficial de Google
    pruebas: true
  };
  const admob = () => window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && Capacitor.Plugins && Capacitor.Plugins.AdMob;

  // ---------- anuncios ----------
  let iniciado = null;
  function iniciarAnuncios() {
    const A = admob(); if (!A) return Promise.resolve(false);
    return iniciado || (iniciado = (async () => {
      try {
        await A.initialize({ initializeForTesting: CONFIG.pruebas });
        const info = await A.requestConsentInfo(); // consentimiento obligatorio en la UE (formulario UMP de Google)
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') await A.showConsentForm();
        return true;
      } catch (e) { iniciado = null; return false; }
    })());
  }
  function esperar(A, eventos, ms) {
    return new Promise(res => {
      const manejadores = []; let hecho = false;
      const fin = v => { if (hecho) return; hecho = true; clearTimeout(t); manejadores.forEach(h => h && h.remove && h.remove()); res(v); };
      const t = setTimeout(() => fin(null), ms);
      eventos.forEach(ev => Promise.resolve(A.addListener(ev, () => fin(ev))).then(h => { manejadores.push(h); if (hecho && h && h.remove) h.remove(); }));
    });
  }
  // null: no hay anuncios nativos (navegador); true/false: el jugador vio el vídeo entero o no
  async function recompensado() {
    const A = admob(); if (!A) return null;
    if (!(await iniciarAnuncios())) return false;
    let premio = false;
    const h = await A.addListener('onRewardedVideoAdReward', () => { premio = true; });
    try {
      await A.prepareRewardVideoAd({ adId: CONFIG.anuncioRecompensado, isTesting: CONFIG.pruebas });
      const cerrado = esperar(A, ['onRewardedVideoAdDismissed', 'onRewardedVideoAdFailedToShow'], 120000);
      await A.showRewardVideoAd();
      await cerrado;
    } catch (e) { /* sin anuncio disponible */ } finally { if (h && h.remove) h.remove(); }
    return premio;
  }
  async function intersticial() {
    const A = admob(); if (!A) return null;
    if (!(await iniciarAnuncios())) return false;
    try {
      await A.prepareInterstitial({ adId: CONFIG.anuncioIntersticial, isTesting: CONFIG.pruebas });
      const cerrado = esperar(A, ['interstitialAdDismissed', 'interstitialAdFailedToShow'], 90000);
      await A.showInterstitial();
      await cerrado;
    } catch (e) { /* sin anuncio disponible */ }
    return true;
  }

  // ---------- pagos de Google Play ----------
  let tienda = null; const pendientes = {};
  function iniciarPagos(productos, entregar) {
    document.addEventListener('deviceready', () => {
      if (!window.CdvPurchase) return;
      const { ProductType, Platform } = CdvPurchase; const store = CdvPurchase.store;
      store.register(Object.keys(productos).map(id => ({ id, platform: Platform.GOOGLE_PLAY,
        type: productos[id].unico || id === 'sin_anuncios' ? ProductType.NON_CONSUMABLE : ProductType.CONSUMABLE })));
      store.when()
        .productUpdated(p => { if (productos[p.id] && p.pricing) productos[p.id].precio = p.pricing.price; }) // precio real de Google Play con IVA
        .approved(tx => tx.verify())
        .verified(recibo => recibo.finish())
        .finished(tx => tx.products.forEach(pr => {
          entregar(pr.id, tx.transactionId);
          const r = pendientes[pr.id]; if (r) { delete pendientes[pr.id]; r(true); }
        }));
      store.initialize([Platform.GOOGLE_PLAY]).then(() => { tienda = store; });
    }, false);
  }
  // null: no hay pagos nativos; true: comprado y entregado; false: cancelado o fallido
  function comprar(id) {
    if (!tienda) return Promise.resolve(null);
    const p = tienda.get(id, CdvPurchase.Platform.GOOGLE_PLAY), oferta = p && p.getOffer();
    if (!oferta) return Promise.resolve(false);
    return new Promise(res => {
      pendientes[id] = res;
      setTimeout(() => { if (pendientes[id]) { delete pendientes[id]; res(false); } }, 180000);
      oferta.order().then(err => { if (err && pendientes[id]) { delete pendientes[id]; res(false); } });
    });
  }
  function restaurar() { return tienda ? tienda.restorePurchases() : Promise.resolve(); }

  return { CONFIG, recompensado, intersticial, iniciarPagos, comprar, restaurar, get pagos() { return !!tienda; }, get anuncios() { return !!admob(); } };
})();
