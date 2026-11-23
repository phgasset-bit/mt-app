// Campaña. Las misiones son una recreación libre: lugares, fechas y unidades son históricos; el detalle táctico es inventado.
// Coordenadas en metros. El jugador avanza hacia -z. Tipos de fase: take (tomar posición), hold (resistir), ambush (emboscada), reach (llegar), nido (defender el fuerte con la ametralladora).
const MISIONES = [
  {
    id: 'perimetro', tit: 'Sidi Ifni: el perímetro', dato: 'Sidi Ifni · noche del 23 de noviembre de 1957',
    parte: ['Las bandas del Ejército de Liberación han cortado las líneas telefónicas y atacan de noche la capital y los puestos del interior.',
      'Tu sección de la VI Bandera cubre un tramo del perímetro. Aguanta el parapeto y después desaloja la loma desde la que os baten.'],
    historia: 'El ataque general empezó la noche del 23 de noviembre de 1957. La capital resistió, pero casi todos los puestos del interior quedaron cercados. La VI Bandera de la Legión había embarcado en Ceuta el 6 de noviembre.',
    noche: true, mar: true, amp: 4, seed: 1.7, inicio: [0, 200], aliados: 5,
    bumps: [[-20, 20, 45, 9], [70, 120, 60, 5], [-90, 150, 50, 4]],
    fases: [
      { tipo: 'hold', x: 0, z: 165, t: 110, cada: 13, n: 3, nom: 'Aguanta el parapeto' },
      { tipo: 'take', x: -20, z: 20, n: 8, nom: 'Desaloja la loma' }
    ]
  },
  {
    id: 'salto', tit: 'Salto sobre Tiliuin', dato: 'Tiliuin · 29 de noviembre de 1957',
    parte: ['Tiliuin lleva días cercado y por tierra no se llega a tiempo. Saltas con la 7.ª Compañía de la Agrupación de Banderas Paracaidistas desde un Junkers a muy poca altura.',
      'Luz verde sobre la zona de salto: pulsa FUEGO para saltar. La campana se abre sola; guíala con el joystick y dispara desde el aire. En tierra, limpia la zona y entra en el fuerte.'],
    historia: 'El 29 de noviembre de 1957 unos 75 paracaidistas saltaron sobre Tiliuin en la operación Pañuelo, el primer salto de guerra del Ejército español, y reforzaron la guarnición cercada hasta que llegó la columna de socorro.',
    amp: 6, seed: 5.3, inicio: [0, 250], aliados: 6, fuerte: [0, -150],
    salto: { alt: 125, zVerde: 140, zMin: -20 },
    bumps: [[30, -20, 40, 6], [-80, 60, 50, 9], [90, 120, 50, 8], [0, -150, 50, 4]],
    fases: [
      { tipo: 'take', x: 30, z: -20, n: 9, nom: 'Limpia la zona de salto' },
      { tipo: 'reach', x: 0, z: -141, nom: 'Entra en el fuerte' }
    ]
  },
  {
    id: 'asedio', tit: 'Tiliuin: el asedio', dato: 'Tiliuin · 30 de noviembre - 2 de diciembre de 1957',
    parte: ['El fuerte aguanta con los tiradores de la guarnición y los paracaidistas recién llegados. Las bandas atacan a oleadas desde las lomas.',
      'Te toca la ametralladora ALFA de la muralla norte. Tira en ráfagas cortas para que no se caliente el cañón y que nadie llegue al pie del muro hasta que asome la columna.'],
    historia: 'La guarnición de Tiliuin resistió el cerco desde el 23 de noviembre. El 3 de diciembre llegó por tierra la VI Bandera de la Legión, que rompió el cerco y evacuó el puesto.',
    amp: 6, seed: 7.7, inicio: [0, -74.2], aliados: 4, fuerte: [0, -60], nido: true,
    bumps: [[0, -60, 45, 3], [-80, -200, 60, 10], [70, -230, 60, 9]],
    fases: [
      { tipo: 'nido', x: 0, z: -74.2, t: 150, cada: 9, n: 4, nom: 'Defiende la muralla' }
    ]
  },
  {
    id: 'marcha', tit: 'La marcha hacia Tiliuin', dato: 'Territorio de Ifni · 1-3 de diciembre de 1957',
    parte: ['El puesto de Tiliuin sigue cercado, ahora con los paracaidistas dentro. Hay que llegar por tierra y romper el cerco.',
      'La columna avanza por pistas de montaña. Vigila las crestas: cada barranco es una emboscada posible.'],
    historia: 'El 29 de noviembre los paracaidistas saltaron sobre Tiliuin (operación Pañuelo), el primer salto de guerra del Ejército español. La columna de socorro de la VI Bandera tuvo que abrirse paso por tierra.',
    amp: 9, seed: 4.2, inicio: [0, 230], aliados: 5,
    bumps: [[-75, 130, 45, 11], [80, 60, 50, 12], [-70, -20, 50, 10], [10, -130, 40, 12], [0, 100, 40, -5], [0, 0, 40, -5]],
    fases: [
      { tipo: 'ambush', x: 5, z: 130, n: 7, nom: 'Sigue la pista' },
      { tipo: 'ambush', x: -5, z: 20, n: 9, nom: 'Cruza el barranco' },
      { tipo: 'take', x: 10, z: -130, n: 9, nom: 'Toma el collado' }
    ]
  },
  {
    id: 'tiliuin', tit: 'Tiliuin: romper el cerco', dato: 'Tiliuin · 3 de diciembre de 1957',
    parte: ['El fuerte está a la vista. Las bandas dominan dos cotas que cierran el paso.',
      'Tómalas una tras otra y enlaza con la guarnición. Tienes una pasada de la aviación: úsala sobre la posición más dura.'],
    historia: 'El 3 de diciembre de 1957 la VI Bandera rompió el cerco de Tiliuin. El fuerte se destruyó y se abandonó; la columna regresó con los sitiados a Sidi Ifni.',
    amp: 8, seed: 2.9, inicio: [0, 235], aliados: 6, avion: 1, fuerte: [0, -165],
    bumps: [[-50, 95, 38, 12], [45, -15, 40, 13], [0, -165, 55, 6]],
    fases: [
      { tipo: 'take', x: -50, z: 95, n: 8, nom: 'Toma la cota 1' },
      { tipo: 'take', x: 45, z: -15, n: 10, nom: 'Toma la cota 2' },
      { tipo: 'take', x: 0, z: -112, n: 8, nom: 'Enlaza con el fuerte' }
    ]
  },
  {
    id: 'repliegue', tit: 'El repliegue', dato: 'De Tiliuin a Sidi Ifni · 5 de diciembre de 1957',
    parte: ['La columna vuelve a la capital con la guarnición y los civiles rescatados. Tu sección va en retaguardia.',
      'Abre paso, y cuando la columna cruce el collado, aguanta allí hasta que haya pasado el último hombre.'],
    historia: 'La columna con los sitiados de Tiliuin y la VI Bandera llegó a Sidi Ifni el 5 de diciembre (alguna fuente da el 6). En toda la campaña la bandera tuvo 6 muertos y 49 heridos.',
    amp: 9, seed: 6.1, inicio: [0, 230], aliados: 5,
    bumps: [[70, 140, 45, 10], [-70, 40, 50, 11], [0, -60, 35, 7], [80, -140, 50, 9]],
    fases: [
      { tipo: 'ambush', x: 0, z: 140, n: 8, nom: 'Abre paso a la columna' },
      { tipo: 'hold', x: 0, z: -60, t: 120, cada: 11, n: 3, nom: 'Aguanta el collado' },
      { tipo: 'reach', x: 0, z: -210, nom: 'Alcanza a la columna' }
    ]
  },
  {
    id: 'cotas', tit: 'Ampliar el perímetro', dato: 'Alrededores de Sidi Ifni · enero-febrero de 1958',
    parte: ['Con los puestos del interior evacuados, toca alejar al enemigo de la capital.',
      'Tres cotas fortificadas, muchas armas automáticas. Avanza de parapeto en parapeto y no malgastes munición.'],
    historia: 'A comienzos de 1958 varias operaciones consolidaron un perímetro defensivo alrededor de Sidi Ifni. España conservó solo la capital y su entorno hasta la retrocesión del territorio a Marruecos en 1969.',
    amp: 8, seed: 8.4, inicio: [0, 240], aliados: 6, avion: 1,
    bumps: [[40, 120, 38, 12], [-55, 0, 42, 14], [30, -130, 45, 15]],
    fases: [
      { tipo: 'take', x: 40, z: 120, n: 10, nom: 'Toma la primera cota' },
      { tipo: 'take', x: -55, z: 0, n: 12, nom: 'Toma la segunda cota' },
      { tipo: 'take', x: 30, z: -130, n: 13, nom: 'Toma la cota principal' }
    ]
  },
  {
    id: 'edchera', tit: 'Epílogo: Edchera', dato: 'Sáhara español, Saguia el Hamra · 13 de enero de 1958',
    parte: ['Otro frente, otra bandera. Un reconocimiento de la Legión sale de El Aaiún hacia Edchera y cae en una emboscada en el cauce seco de la Saguia.',
      'Sal de la emboscada, resiste donde te pille y limpia el cauce.'],
    historia: 'El combate de Edchera, el 13 de enero de 1958, fue el más duro de la Legión en esta guerra, con decenas de muertos y heridos (XIII Bandera según la mayoría de las fuentes). El brigada Fadrique Castromonte y el legionario Maderal Oleaga recibieron a título póstumo las últimas Laureadas de San Fernando concedidas.',
    desierto: true, amp: 3, seed: 3.3, inicio: [0, 230], aliados: 6,
    bumps: [[0, -110, 70, -7], [-120, -110, 70, -6], [120, -110, 70, -6], [60, 60, 30, 4], [-50, 20, 30, 4]],
    fases: [
      { tipo: 'ambush', x: 0, z: 120, n: 11, nom: 'Sal de la emboscada' },
      { tipo: 'hold', x: -10, z: 30, t: 110, cada: 10, n: 4, nom: 'Resiste en las dunas' },
      { tipo: 'take', x: 0, z: -110, n: 13, nom: 'Limpia el cauce' }
    ]
  }
];
