# Publicar Ifni 1957 en Google Play con pagos y anuncios reales

## Lo que ya está hecho en el juego

- Anuncios reales de Google (AdMob): vídeo recompensado (doblar pesetas, revivir, oro) e intersticial cada 2 misiones, con el formulario de consentimiento obligatorio en la UE. Ya usa los bloques reales de la cuenta de AdMob (app `ca-app-pub-5467403730677498~5825361998`); el APK de pruebas pide anuncios de prueba y solo el paquete de Google Play muestra anuncios reales.
- Pagos reales de Google Play: bolsas de oro y de pesetas, «Sin anuncios» y Pack Veterano. Cada compra se entrega una sola vez y hay botón «Restaurar compras». Los precios se muestran como los fija Google Play.
- La compilación de GitHub genera el APK de pruebas y, cuando tenga la clave de subida, el paquete AAB firmado que se sube a Google Play. El número de versión sube solo.

## Lo que tienes que hacer tú

### 1. Cuenta de desarrollador de Google Play (25 €, pago único)

- En play.google.com/console. Puede ser personal o de MNM SOLAR (organización).
- **Importante**: las cuentas **personales** nuevas deben hacer una prueba cerrada con **al menos 12 probadores durante 14 días** antes de poder publicar para todo el mundo. Las cuentas de **organización** no tienen esa obligación, pero piden el número D-U-N-S de la empresa (gratuito, tarda unos días).
- Verificación de identidad y perfil de pagos (cuenta bancaria para cobrar las ventas; Google se queda un 15 % de los primeros 1 M$ al año).

### 2. Cuenta de AdMob (gratis)

- En admob.google.com, con la misma cuenta de Google.
- Crear la app «Ifni 1957» (Android) y dos bloques de anuncios: **Recompensado** e **Intersticial**.
- Pasarme los tres identificadores (app `ca-app-pub-…~…` y los dos bloques `ca-app-pub-…/…`). No son secretos.
- Configurar el mensaje de consentimiento del RGPD en «Privacidad y mensajería» (el juego ya lo muestra).

### 3. Crear la app en Play Console

- Nombre, idioma (español), juego, gratuito con compras.
- **Productos de compra integrada** (Monetizar → Productos), con estos identificadores exactos:
  - Consumibles: `oro_100` (0,99 €), `oro_550` (4,99 €), `oro_1200` (9,99 €), `oro_2500` (19,99 €), `pts_3000` (0,99 €), `pts_16000` (4,99 €), `pts_35000` (9,99 €)
  - No consumibles: `sin_anuncios` (3,99 €), `veterano` (2,99 €)
- Cuestionario de clasificación (IARC): violencia realista → previsiblemente PEGI 16.
- Formulario de seguridad de los datos: anuncios (ID de publicidad), compras; sin datos personales propios.
- Política de privacidad: hace falta una URL pública. La redacto yo cuando quieras.
- Ficha: icono 512×512, gráfico destacado 1024×500, al menos 2 capturas, descripciones. Los preparo yo.

### 4. Clave de subida (firma de la app)

- Google Play firma la app con su clave («Firma de apps de Google Play»); tú solo necesitas una clave de subida.
- La genero yo y te la entrego por un canal privado (tu Google Drive). Tú la guardas en GitHub → repositorio → Settings → Secrets and variables → Actions:
  - `FIRMA_B64` (el archivo de la clave en base64), `FIRMA_CLAVE` (contraseña), `FIRMA_ALIAS` (alias)
- Desde ese momento cada compilación genera también `ifni-1957-google-play-aab`, que es lo que se sube a Play Console.

### 5. Pruebas y publicación

1. Subir el AAB a **Prueba interna** y probar compras con cuentas de prueba de licencias (no se cobra).
2. Prueba cerrada (obligatoria en cuentas personales: 12 probadores, 14 días).
3. Producción.

## Pendiente técnico antes de producción

- Publicar `app-ads.txt` en la web del desarrollador con la línea `google.com, pub-5467403730677498, DIRECT, f08c47fec0942fa0`.
- Guardado en la nube del progreso (Play Juegos) para no perder compras al desinstalar.
- Recomendado: verificación de compras en servidor (contra fraude).
- Consultar el uso comercial del emblema de la Legión con el Ministerio de Defensa.
