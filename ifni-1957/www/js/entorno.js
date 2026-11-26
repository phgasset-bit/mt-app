// Entorno de la compilación. La compilación para Google Play añade al final IFNI_PRODUCCION = true.
window.IFNI_PRODUCCION = false;
// Base de datos en la nube (Firebase) para las banderas y la copia del progreso.
// Estos dos datos no son secretos: lo que protege los datos son las reglas de Firestore (docs/ACTIVAR_BANDERAS.md).
window.IFNI_FIREBASE = { apiKey: 'AIzaSyC_YXVElFGrLJItQXc_bU9FNPDlrVoU_zs', projectId: 'ifni-1957' };
