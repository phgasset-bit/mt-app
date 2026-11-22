// Ajusta el proyecto Android generado por Capacitor: horizontal, pantalla completa y pantalla siempre encendida.
const fs = require('fs');
const man = 'android/app/src/main/AndroidManifest.xml';
let m = fs.readFileSync(man, 'utf8');
if (!m.includes('screenOrientation')) m = m.replace('<activity', '<activity android:screenOrientation="sensorLandscape"');
// identificador de la app de AdMob (variable ADMOB_APP_ID; por defecto el de prueba oficial de Google)
const admobApp = process.env.ADMOB_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
if (!m.includes('com.google.android.gms.ads.APPLICATION_ID')) m = m.replace(/<application([^>]*)>/, `<application$1>
        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${admobApp}"/>`);
fs.writeFileSync(man, m);
const sty = 'android/app/src/main/res/values/styles.xml';
let s = fs.readFileSync(sty, 'utf8');
if (!s.includes('windowFullscreen')) s = s.replace(/(<style name="AppTheme.NoActionBar"[^>]*>)/, '$1\n        <item name="android:windowFullscreen">true</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>');
fs.writeFileSync(sty, s);
const act = 'android/app/src/main/java/com/mnmsolar/ifni1957/MainActivity.java';
fs.writeFileSync(act, `package com.mnmsolar.ifni1957;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }
}
`);
// firma de pruebas fija: cada APK se instala encima del anterior
const gr = 'android/app/build.gradle';
let b = fs.readFileSync(gr, 'utf8');
if (!b.includes('tools/debug.keystore')) {
  b = b.replace(/android\s*\{/, `android {
    signingConfigs {
        debug {
            storeFile file('../../tools/debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`);
  fs.writeFileSync(gr, b);
}
// número de versión: Google Play exige que suba en cada envío (VERSION_CODE = número de compilación)
const vc = parseInt(process.env.VERSION_CODE || '1', 10);
b = fs.readFileSync(gr, 'utf8').replace(/versionCode \d+/, 'versionCode ' + vc).replace(/versionName "[^"]*"/, 'versionName "1.0.' + vc + '"');
// firma de publicación (clave de subida de Google Play) solo si la compilación la recibe por variables secretas
if (process.env.FIRMA_ALMACEN && !b.includes('signingConfigs.release')) {
  b = b.replace(/signingConfigs \{/, `signingConfigs {
        release {
            storeFile file(System.getenv('FIRMA_ALMACEN'))
            storePassword System.getenv('FIRMA_CLAVE')
            keyAlias System.getenv('FIRMA_ALIAS')
            keyPassword System.getenv('FIRMA_CLAVE')
        }`).replace(/release \{\s*minifyEnabled/, 'release {\n            signingConfig signingConfigs.release\n            minifyEnabled');
}
fs.writeFileSync(gr, b);
console.log('Proyecto Android ajustado');
