# Ifni 1957

Juego de combate en primera persona para Android, ambientado en la guerra de Ifni (1957-1958). Eres un legionario de la VI Bandera.

## Campaña

1. **Sidi Ifni: el perímetro** (noche del 23 nov. 1957): aguantar el parapeto y desalojar la loma.
2. **La marcha hacia Tiliuin** (1-3 dic.): emboscadas en la pista y toma del collado.
3. **Tiliuin: romper el cerco** (3 dic.): asalto a dos cotas y enlace con el fuerte. Misión de referencia del prototipo.
4. **El repliegue** (5 dic.): abrir paso y resistir en el collado.
5. **Ampliar el perímetro** (ene.-feb. 1958): tres cotas fortificadas.
6. **Epílogo: Edchera** (13 ene. 1958, Sáhara): emboscada en la Saguia el Hamra.

Lugares, fechas y unidades son históricos; el detalle táctico de cada combate es una recreación libre.

## Mandos

- **Táctil**: pulgar izquierdo mueve (stick flotante), pulgar derecho gira la vista. FUEGO dispara y gira si lo arrastras. Hay un segundo FUEGO a la izquierda. Disparo automático opcional al apuntar a un enemigo.
- **Teclado y ratón**: WASD, ratón, clic, clic derecho para apuntar, R, G, C, V (¡Viva!), Q, H, B, Esc.
- Ajustes: sensibilidad, volumen, disparo automático, modo zurdo y dificultad.

## Estructura

- `www/`: el juego (HTML + three.js r128). `js/world.js` escenario y modelos, `js/game.js` motor, `js/missions.js` campaña, `js/audio.js` sonido.
- `www/audio/`: gritos generados con voces neuronales Piper (es-ES) y procesados con ffmpeg para que suenen a grito de combate y a coro de sección. Se regeneran con `tools/gen_voices.sh` (los modelos de voz se descargan aparte en `tools/voices/`).
- `tools/android_ajustes.js`: fuerza horizontal, pantalla completa y pantalla encendida en el proyecto Android.
- `.github/workflows/apk.yml`: compila el APK en GitHub Actions en cada push a `main`. El APK aparece como artefacto descargable del workflow.

## Desarrollo

```bash
npm install
npm run serve          # http://localhost:8080
npm run android        # genera el proyecto Android con Capacitor
cd android && ./gradlew assembleDebug   # requiere el SDK de Android
```
