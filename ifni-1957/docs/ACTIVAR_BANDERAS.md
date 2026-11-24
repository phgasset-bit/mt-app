# Activar las banderas y la copia del progreso (Firebase)

El juego ya trae el código. Solo falta crear la base de datos y decirle al juego cuál es.
El plan gratuito de Firebase (Spark) sobra para empezar.

## 1. Crear el proyecto

1. Entra en https://console.firebase.google.com con la cuenta de Google de la empresa y pulsa **Crear un proyecto** (por ejemplo «ifni-1957»). Google Analytics no hace falta.
2. **Compilación → Authentication → Comenzar → Método de acceso → Anónimo → Habilitar.**
3. **Compilación → Firestore Database → Crear base de datos**, ubicación `eur3 (Europe)`, en modo de producción.

## 2. Reglas de seguridad

En Firestore → pestaña **Reglas**, pega esto y pulsa Publicar:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // copia del progreso: cada jugador solo ve y escribe la suya
    match /usuarios/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /banderas/{codigo} {
      allow read: if request.auth != null;
      // se puede crear una bandera, pero no cambiarla ni borrarla después
      allow create: if request.auth != null
        && request.resource.data.creador == request.auth.uid
        && request.resource.data.nombre is string
        && request.resource.data.nombre.size() <= 24;
      match /miembros/{uid} {
        allow read: if request.auth != null;
        allow create, update: if request.auth != null && request.auth.uid == uid
          && request.resource.data.nombre is string && request.resource.data.nombre.size() <= 24
          && request.resource.data.puntos is int && request.resource.data.puntos >= 0;
        allow delete: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

## 3. Pasar los dos datos al juego

En Firebase → ⚙ **Configuración del proyecto → General → Tus apps → Añadir app → Web**. Te da un bloque con `apiKey` y `projectId`.
Esos dos valores no son secretos (van dentro de cualquier app); lo que protege los datos son las reglas del paso 2.

Pásaselos a Claude, o ponlos tú en `www/js/entorno.js`:

```js
window.IFNI_FIREBASE = { apiKey: 'AIza...', projectId: 'ifni-1957' };
```

## Qué se guarda en la nube

- De cada jugador: el apellido que puso a su legionario, su aspecto, arma, experiencia y puntos de la semana, y una copia de su progreso.
- Ningún correo, teléfono ni dato del dispositivo. La sesión es anónima.

## Antes de publicarlo en Google Play

- Añadir a la política de privacidad que el progreso y el nombre del legionario se guardan en Firebase (Google) y que los compañeros de bandera ven ese nombre.
- Declararlo en el formulario «Seguridad de los datos» de Play Console.
- Los puntos los envía el propio móvil, así que un jugador con conocimientos podría falsearlos. Para un ranking entre amigos es aceptable; si un día hay premios, habrá que validarlos en un servidor.
