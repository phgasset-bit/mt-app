# Grabar los gritos del juego con voz real

## Cómo grabar

- Con la grabadora del móvil o con notas de voz de WhatsApp. Cualquier formato vale.
- **Grita de verdad**, como en formación. Móvil a un palmo largo de la boca (20-30 cm), sin taparlo con la mano.
- Mejor en un sitio sin eco y sin ruido de fondo: un coche aparcado o una habitación con muebles; el eco de combate lo pongo yo.
- **Una frase por archivo** y **2 o 3 tomas de cada una**. El nombre del archivo da igual: el importador reconoce lo que dices.
- Deja un segundo de silencio antes y después.

## Qué grabar

### Tu voz (el jugador)

1. ¡Viva España!
2. ¡Viva la Legión!
3. ¡A mí la Legión!
4. ¡Adelante, legionarios!
5. ¡Al asalto!
6. ¡Granada! ¡Al suelo!
7. ¡Recargando!
8. ¡Posición tomada!
9. ¡Legionarios, a luchar! ¡Legionarios, a morir!

### La escuadra (otra persona, o tú cambiando la voz)

10. ¡Abrid fuego!
11. ¡Cubridme!
12. ¡Enemigo al frente!
13. ¡Ay! ¡Me han dado!
14. ¡Sanitario! ¡Sanitario!
15. ¡Aviación! ¡Cuerpo a tierra!
16. ¡Emboscada!

### Coros

17. ¡Viva! (respuesta de la sección)

Para los coros sirven todas tus tomas de «¡Viva!», «¡Viva España!», «¡Viva la Legión!» y «Legionarios, a luchar»: se mezclan en capas para que suene a una sección entera. Si grabáis varias personas, mejor todavía; cada uno puede mandar sus tomas sueltas.

Si solo grabas tu voz, las frases de la escuadra con «¡Viva!» se hacen con tu voz algo más grave, para que no suenen igual que tú. Lo que no se grabe sigue con la voz sintética.

## Cómo hacérmelas llegar

- Súbelas a una carpeta de Google Drive (por ejemplo «Ifni voces») y dime el nombre, o
- adjúntalas en el chat si la app te lo permite.

## Procesado

```bash
HF_HUB_DISABLE_XET=1 python3 tools/importar_voces.py carpeta_con_audios --solo-informe   # ver qué ha reconocido
HF_HUB_DISABLE_XET=1 python3 tools/importar_voces.py carpeta_con_audios                  # generar www/audio/
```
