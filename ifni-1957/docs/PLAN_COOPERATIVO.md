# Plan del modo cooperativo en línea de Ifni 1957

Objetivo: que de 2 a 4 jugadores hagan juntos la campaña, misión a misión y en orden, como una sola escuadra.

## Cómo es hoy el juego (y por qué esto no es un cambio pequeño)

- Todo el combate vive en `www/js/game.js` y está escrito para **un solo jugador**: hay un único objeto `P` (posición, vida, arma) y la IA, el HUD, las fases y la cámara lo usan directamente.
- No hay servidor de ningún tipo: el progreso se guarda en el móvil.
- Para jugar en red hacen falta tres piezas que hoy no existen: varios jugadores en el motor, un servicio que conecte los móviles entre sí y una pantalla de sala.

## Arquitectura recomendada

**Un jugador hace de anfitrión y su móvil manda; un servidor pequeño solo reparte mensajes.**

- El anfitrión simula enemigos, fases, mortero, botín y civiles, igual que ahora.
- Los invitados envían su posición, hacia dónde miran, disparos, granadas y cuchilladas (unas 15 veces por segundo).
- El anfitrión envía a todos el estado de enemigos, aliados y fase (10-15 veces por segundo); cada móvil lo suaviza interpolando.
- El servidor es un repetidor por WebSocket con salas identificadas por un código de 5 letras. No simula nada, así que es barato.

Por qué esta y no otras:

| Opción | Ventaja | Inconveniente |
|---|---|---|
| **Anfitrión + repetidor WebSocket (recomendada)** | Funciona con datos móviles, coste bajo, reutiliza la IA actual | Si el anfitrión se cae, se acaba la partida |
| Conexión directa entre móviles (WebRTC) | Sin coste de tráfico | Falla en muchas redes móviles; igual hace falta un servidor para conectar |
| Servidor que simula toda la partida | Más robusto, sin trampas | Hay que reescribir la IA para el servidor; coste y trabajo mucho mayores |
| Base de datos en tiempo real (Firebase) | Sin servidor propio | Demasiado lenta para un juego de disparos |

Al ser cooperativo contra la máquina, las trampas importan poco, y por eso basta con fiarse del anfitrión.

## Qué hay que contratar

- Un servidor pequeño siempre encendido para el repetidor (del orden de 5-10 € al mes en un proveedor europeo).
- Un dominio o subdominio con certificado (por ejemplo `juego.mnm-solar.com`).
- Esto lo tiene que dar de alta la empresa; el código del repetidor lo escribo yo.

## Fases del trabajo

**Fase 0 · Preparar el motor (la más larga)**
- Separar «el jugador local» de «un jugador»: lista de jugadores, cada uno con su posición, vida, arma y modelo de legionario visible para los demás.
- Que la IA enemiga elija objetivo entre todos los jugadores.
- Identificador fijo para cada enemigo, aliado y objeto, para poder sincronizarlos.
- El juego en solitario debe seguir funcionando igual: se prueba en cada paso.

**Fase 1 · Sala y conexión**
- Pantalla «Jugar con amigos»: crear sala (da un código) o unirse con un código.
- Lista de jugadores con su legionario, empleo y botón «Listo».
- Repetidor WebSocket con salas, reconexión y límite de 4 jugadores.

**Fase 2 · Verse y combatir juntos**
- Posición, postura, arma y disparos de cada jugador.
- Gritos («¡Viva España!») que oyen todos.
- Daño a enemigos decidido por el anfitrión.

**Fase 3 · La misión compartida**
- Enemigos, fases, mortero, contraataques, botín y casas con civiles, sincronizados.
- Un jugador caído queda herido y **otro jugador puede vendarlo**, usando la mecánica de heridos que ya existe. Si caen todos, se repite la misión.
- Los legionarios de la IA rellenan los huecos hasta completar la escuadra.

**Fase 4 · Campaña en orden**
- La sala avanza por las misiones en orden; al terminar una se vota «siguiente».
- Parte final con la puntuación de cada uno y un premio extra por jugar en equipo.
- El progreso de la campaña cooperativa se guarda por sala y por jugador.

**Fase 5 · Papeles de equipo (lo que más fomenta colaborar)**
- Carro: uno conduce y otro dispara el cañón.
- Aviación: uno marca el objetivo desde tierra y otro pilota el Heinkel.
- Salto en paracaídas todos a la vez; ametralladora de la muralla con un tirador y un proveedor.

**Fase 6 · Antes de publicarlo**
- Actualizar la política de privacidad y el formulario de datos de Google Play (ahora habría tráfico entre jugadores y nombres visibles).
- Filtro para los apellidos de los legionarios y opción de denunciar o expulsar de la sala.
- Pruebas con móviles reales en datos móviles.

## Orden de magnitud

- Fase 0: es la mayor parte del riesgo, porque toca casi todo `game.js`.
- Fases 1 a 4: un cooperativo jugable.
- Fases 5 y 6: lo que lo hace distinto y publicable.

No es un cambio de una tarde como los anteriores: son varias semanas de trabajo por entregas, y no se puede probar sin dos móviles conectados a la vez.

## Riesgos

- **Retardo en redes móviles:** se nota al disparar a enemigos que se mueven. Se mitiga dando por bueno el disparo en el móvil del que dispara.
- **Rendimiento:** más legionarios con modelo completo en pantalla; en móviles modestos habrá que bajar detalle.
- **El anfitrión se desconecta:** la partida se pierde. Se puede mejorar más adelante pasando el mando a otro jugador.
- **Mantenimiento:** un servidor que vigilar y pagar todos los meses.

## Un primer paso barato, sin servidor de partidas

Si se quiere fomentar lo colaborativo antes de abordar todo lo anterior:

- **Banderas (clanes):** los jugadores se apuntan a una bandera y suman puntos juntos cada semana, con objetivo común y premio para todos.
- **Refuerzos de amigos:** elegir como compañero de escuadra al legionario de un amigo (con su aspecto, medallas y armas), manejado por la IA.

Solo necesita una base de datos pequeña en la nube (la misma que haría falta para guardar el progreso), no un servidor de partidas en tiempo real.
