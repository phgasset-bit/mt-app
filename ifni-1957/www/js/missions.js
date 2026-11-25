// Campaña. Las misiones son una recreación libre: lugares, fechas y unidades son históricos; el detalle táctico es inventado.
// Coordenadas en metros. El jugador avanza hacia -z. Tipos de fase: take (tomar posición), hold (resistir), ambush (emboscada), reach (llegar), nido (defender el fuerte con la ametralladora), tiradores (enemigos lejanos que hay que abatir con la mira), carga (enemigos que se echan encima).
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
      { tipo: 'take', x: -20, z: 20, n: 8, pos: 'trinchera', nom: 'Desaloja la trinchera de la loma' }
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
      { tipo: 'take', x: 30, z: -20, n: 9, pos: 'rocas', nom: 'Limpia los peñascos de la zona de salto' },
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
    amp: 9, seed: 4.2, inicio: [0, 230], aliados: 5, avion: 1,
    bumps: [[-75, 130, 45, 11], [80, 60, 50, 12], [-70, -20, 50, 10], [10, -130, 40, 12], [0, 100, 40, -5], [0, 0, 40, -5]],
    fases: [
      { tipo: 'ambush', x: 5, z: 130, n: 7, nom: 'Sigue la pista' },
      { tipo: 'ambush', x: -5, z: 20, n: 9, nom: 'Cruza el barranco' },
      { tipo: 'tiradores', x: 0, z: -60, n: 4, nom: 'Abate a los tiradores de la cresta' },
      { tipo: 'take', x: 10, z: -130, n: 9, pos: 'rocas', contra: 5, nom: 'Toma el collado' }
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
      { tipo: 'take', x: -50, z: 95, n: 8, pos: 'morabito', nom: 'Toma el morabito' },
      { tipo: 'take', x: 45, z: -15, n: 10, pos: 'aldea', contra: 5, nom: 'Limpia el aduar' },
      { tipo: 'take', x: 0, z: -112, n: 8, nom: 'Enlaza con el fuerte' }
    ]
  },
  {
    id: 'repliegue', tit: 'El repliegue', dato: 'De Tiliuin a Sidi Ifni · 5 de diciembre de 1957',
    parte: ['La columna vuelve a la capital con la guarnición y los civiles rescatados. Tu sección va en retaguardia.',
      'Abre paso, y cuando la columna cruce el collado, aguanta allí hasta que haya pasado el último hombre.'],
    historia: 'La columna con los sitiados de Tiliuin y la VI Bandera llegó a Sidi Ifni el 5 de diciembre (alguna fuente da el 6). En toda la campaña la bandera tuvo 6 muertos y 49 heridos.',
    amp: 9, seed: 6.1, inicio: [0, 230], aliados: 5, clima: 'atardecer',
    bumps: [[70, 140, 45, 10], [-70, 40, 50, 11], [0, -60, 35, 7], [80, -140, 50, 9]],
    fases: [
      { tipo: 'ambush', x: 0, z: 140, n: 8, nom: 'Abre paso a la columna' },
      { tipo: 'carga', x: 0, z: 60, n: 7, nom: 'Rechaza la carga' },
      { tipo: 'hold', x: 0, z: -60, t: 120, cada: 11, n: 3, nom: 'Aguanta el collado' },
      { tipo: 'reach', x: 0, z: -210, nom: 'Alcanza a la columna' }
    ]
  },
  {
    id: 'convoy', tit: 'El convoy', dato: 'Pistas del interior de Ifni · diciembre de 1957',
    parte: ['Los puestos del interior se evacúan uno a uno. Tres camiones con heridos, munición y agua vuelven a la capital por una pista de montaña.',
      'Tu sección va a pie por delante. Los camiones solo avanzan cuando no hay fuego: limpia cada emboscada deprisa, porque mientras dure el tiroteo el convoy sufre.'],
    historia: 'En diciembre de 1957 las columnas españolas socorrieron y evacuaron los puestos cercados del interior (Tiliuin, Telata, Tiugsa, Tenin...) y regresaron a Sidi Ifni por pistas batidas desde las alturas. Esta misión es una recreación libre de aquellas marchas.',
    amp: 9, seed: 11.3, inicio: [0, 225], aliados: 6, convoy: true, avion: 1,
    bumps: [[-70, 150, 45, 11], [75, 70, 50, 12], [-75, -20, 50, 11], [70, -110, 45, 12], [0, -200, 40, 5]],
    fases: [
      { tipo: 'ambush', x: 0, z: 140, n: 7, nom: 'Abre paso al convoy' },
      { tipo: 'ambush', x: 0, z: 30, n: 9, nom: 'Cruza la vaguada' },
      { tipo: 'tiradores', x: 0, z: -40, n: 5, nom: 'Abate a los tiradores que baten la pista' },
      { tipo: 'ambush', x: 0, z: -90, n: 10, nom: 'Despeja el collado' },
      { tipo: 'reach', x: 0, z: -205, nom: 'Lleva el convoy al llano' }
    ]
  },
  {
    id: 'cotas', tit: 'Ampliar el perímetro', dato: 'Alrededores de Sidi Ifni · enero-febrero de 1958',
    parte: ['Con los puestos del interior evacuados, toca alejar al enemigo de la capital.',
      'Tres cotas fortificadas, muchas armas automáticas. Avanza de parapeto en parapeto y no malgastes munición.'],
    historia: 'A comienzos de 1958 varias operaciones consolidaron un perímetro defensivo alrededor de Sidi Ifni. España conservó solo la capital y su entorno hasta la retrocesión del territorio a Marruecos en 1969.',
    amp: 8, seed: 8.4, inicio: [0, 240], aliados: 6, avion: 1, clima: 'siroco',
    bumps: [[40, 120, 38, 12], [-55, 0, 42, 14], [30, -130, 45, 15]],
    fases: [
      { tipo: 'take', x: 40, z: 120, n: 10, pos: 'trinchera', nom: 'Asalta la trinchera' },
      { tipo: 'carga', x: 0, z: 70, n: 8, nom: 'Rechaza la carga' },
      { tipo: 'take', x: -55, z: 0, n: 12, pos: 'aldea', nom: 'Toma el aduar fortificado' },
      { tipo: 'tiradores', x: 0, z: -70, n: 5, nom: 'Abate a los tiradores de la cota' },
      { tipo: 'take', x: 30, z: -130, n: 13, contra: 6, nom: 'Toma la cota principal' }
    ]
  },
  {
    id: 'edchera', epilogo: true, tit: 'Epílogo: Edchera', dato: 'Sáhara español, Saguia el Hamra · 13 de enero de 1958',
    parte: ['Otro frente, otra bandera. Un reconocimiento de la Legión sale de El Aaiún hacia Edchera y cae en una emboscada en el cauce seco de la Saguia.',
      'Sal de la emboscada, resiste donde te pille y limpia el cauce.'],
    historia: 'El combate de Edchera, el 13 de enero de 1958, fue el más duro de la Legión en esta guerra, con decenas de muertos y heridos (XIII Bandera según la mayoría de las fuentes). El brigada Fadrique Castromonte y el legionario Maderal Oleaga recibieron a título póstumo las últimas Laureadas de San Fernando concedidas.',
    desierto: true, amp: 3, seed: 3.3, inicio: [0, 230], aliados: 6,
    bumps: [[0, -110, 70, -7], [-120, -110, 70, -6], [120, -110, 70, -6], [60, 60, 30, 4], [-50, 20, 30, 4]],
    fases: [
      { tipo: 'ambush', x: 0, z: 120, n: 11, nom: 'Sal de la emboscada' },
      { tipo: 'carga', x: 0, z: 80, n: 8, nom: 'Rechaza la carga' },
      { tipo: 'hold', x: -10, z: 30, t: 110, cada: 10, n: 4, nom: 'Resiste en las dunas' },
      { tipo: 'take', x: 0, z: -110, n: 13, pos: 'rocas', nom: 'Limpia el cauce' }
    ]
  },
  {
    id: 'tafudart', epilogo: true, tit: 'Epílogo: los carros de Tafudart', dato: 'Sáhara español, Saguia el Hamra · febrero de 1958',
    parte: ['Operación Teide: españoles y franceses barren el Sáhara. Con la Legión avanzan los carros ligeros M-24 del Regimiento de Caballería Pavía, desembarcados en Villa Bens.',
      'Mandas una sección de tres M-24 que apoya a la II Bandera. Primero los puestos avanzados; después, cruzando el cauce seco, el poblado fortificado de Tafudart: tapias de adobe, torres y una alcazaba. Bate los muros con el cañón, usa la ametralladora contra los que salgan a campo abierto y no dejes atrás a los legionarios.'],
    historia: 'En la operación Teide-Écouvillon (10-25 de febrero de 1958) las tropas españolas y francesas expulsaron del Sáhara al Ejército de Liberación. Los carros M-24 del Regimiento Pavía, únicos carros de combate españoles de toda la campaña, apoyaron con su fuego a la Legión en el ataque a Tafudart. En el territorio de Ifni no llegó a combatir ningún carro.',
    desierto: true, amp: 3, seed: 9.6, inicio: [0, 235], aliados: 8, carro: true,
    bumps: [[-45, 120, 36, 5], [0, 20, 200, -3], [0, -150, 70, 5], [-120, -40, 60, 7], [120, 30, 60, 6], [60, 150, 40, 4]],
    fases: [
      { tipo: 'take', x: -45, z: 120, n: 10, nom: 'Bate los puestos avanzados' },
      { tipo: 'take', x: 0, z: -150, n: 26, poblado: true, nom: 'Asalta el poblado de Tafudart' }
    ]
  },
  {
    id: 'buchon1', epilogo: true, tit: 'Buchones sobre la Saguia', dato: 'Aeródromo de El Aaiún · febrero de 1958',
    parte: ['El 71 Escuadrón ha llegado a África con sus Hispano HA-1112 «Buchón». No hay aviación enemiga: vuestro trabajo es el ataque a tierra.',
      'Pulsa GAS y el avión despega solo. En el aire, el joystick hacia arriba sube y hacia los lados gira. Bate las dos posiciones que frenan a la columna y vuelve a tomar tierra: cañones de 20 mm con CAÑÓN y cohetes de 80 mm con COHETE. No bajes demasiado sobre el enemigo: tiran a todo lo que vuela.'],
    historia: 'El 71 Escuadrón, con cazas Hispano Aviación HA-1112-M1L «Buchón», salió hacia África el 30 de enero de 1958 y operó desde Gando y El Aaiún. Sin aviación enemiga, los Buchones se emplearon en ataque a tierra con sus cañones de 20 mm y cohetes de 80 mm.',
    desierto: true, amp: 2, seed: 12.4, inicio: [120, 250], aliados: 0, caza: true, pista: { x: 120, z0: 255, z1: 40 },
    bumps: [[-60, 40, 45, 6], [-20, -170, 55, 7], [120, 150, 90, -2]],
    fases: [
      { tipo: 'take', x: -60, z: 40, n: 9, pos: 'trinchera', nom: 'Bate la trinchera' },
      { tipo: 'take', x: -20, z: -170, n: 11, pos: 'rocas', nom: 'Bate los peñascos' },
      { tipo: 'aterriza', x: 120, z: 240, nom: 'Vuelve al aeródromo y toma tierra' }
    ]
  },
  {
    id: 'buchon2', epilogo: true, tit: 'Apoyo a la columna', dato: 'Sáhara español · febrero de 1958',
    parte: ['La columna de la Legión está detenida ante un poblado fortificado. Piden fuego desde el aire.',
      'Tres objetivos: los puestos avanzados, la trinchera y el poblado. En el poblado hay casas con civiles: bate los parapetos y las torres, no las casas. Te quedan ocho cohetes; adminístralos.'],
    historia: 'En la operación Teide (febrero de 1958) la aviación española apoyó el avance de las columnas en el Sáhara. Las aeronaves, veteranas de otra época, volvían a menudo con impactos de fusilería recibidos en los vuelos rasantes.',
    desierto: true, amp: 2, seed: 15.8, inicio: [-120, 250], aliados: 0, caza: true, pista: { x: -120, z0: 255, z1: 40 },
    bumps: [[40, 90, 40, 5], [-40, -40, 45, 5], [30, -170, 70, 6], [-120, 150, 90, -2]],
    fases: [
      { tipo: 'take', x: 40, z: 90, n: 8, nom: 'Bate los puestos avanzados' },
      { tipo: 'take', x: -40, z: -40, n: 10, pos: 'trinchera', nom: 'Bate la trinchera' },
      { tipo: 'take', x: 30, z: -170, n: 14, poblado: true, nom: 'Bate el poblado sin tocar las casas' },
      { tipo: 'aterriza', x: -120, z: 240, nom: 'Vuelve al aeródromo y toma tierra' }
    ]
  }
];


// Campañas: varias misiones seguidas, como etapas de una misma operación. Entre etapa y etapa se conservan la salud, las vendas y las granadas.
// «informe» es lo que cuenta el sargento antes de salir; «ordenes» resume qué hay que conseguir en cada etapa.
const CAMPANAS = [
  {
    id: 'socorro', tit: 'Socorro a Tiliuin', dato: 'Territorio de Ifni · 23 de noviembre - 3 de diciembre de 1957', sargento: 'Sargento Mendizábal',
    etapas: ['perimetro', 'salto', 'asedio', 'marcha', 'tiliuin'],
    informe: ['Legionarios, atentos. La noche del 23 de noviembre las bandas del Ejército de Liberación cortaron los teléfonos y atacaron Sidi Ifni y todos los puestos del interior. La capital aguanta, pero Tiliuin lleva días cercado, con sesenta hombres dentro.',
      'La operación tiene cinco tiempos. Primero aguantamos el perímetro esta noche. Después saltamos en paracaídas sobre Tiliuin y defendemos su muralla con la ametralladora. Y por último marchamos por la montaña, rompemos el cerco y sacamos de allí a la guarnición.',
      'De lejos os tirarán desde las crestas: cuerpo a tierra y mira. De cerca, casa por casa y con cuidado, que habrá civiles. Nadie se queda atrás.'],
    ordenes: ['Aguantar el parapeto y desalojar la trinchera de la loma', 'Saltar sobre Tiliuin, limpiar la zona de salto y entrar en el fuerte', 'Defender la muralla con la ametralladora hasta que llegue la columna', 'Abrirse paso por la montaña: emboscadas, tiradores y el collado', 'Tomar el morabito y el aduar, y enlazar con el fuerte']
  },
  {
    id: 'repliegue', tit: 'El camino de vuelta', dato: 'De Tiliuin a Sidi Ifni · diciembre de 1957 - febrero de 1958', sargento: 'Sargento Mendizábal',
    etapas: ['repliegue', 'convoy', 'cotas'],
    informe: ['Tiliuin está evacuado y volado. Ahora toca lo más difícil: volver. La columna lleva a la guarnición, a los heridos y a los civiles por pistas que el enemigo bate desde las alturas.',
      'Tres tiempos. Primero cubrimos la retaguardia de la columna, de emboscada en emboscada, hasta el collado. Después escoltamos el convoy de camiones: solo avanzan cuando no hay fuego. Y ya en la capital, ensanchamos el perímetro tomando las cotas que la dominan.',
      'Os cargarán a corta distancia y os tirarán desde lejos el mismo día. Munición hay la justa: recoged la de los caídos.'],
    ordenes: ['Cubrir la retaguardia, rechazar la carga y aguantar el collado', 'Escoltar los tres camiones hasta el llano sin que los destruyan', 'Tomar la trinchera, el aduar fortificado y la cota principal']
  },
  {
    id: 'sahara', tit: 'Sáhara: Edchera y Tafudart', dato: 'Saguia el Hamra · enero - febrero de 1958', sargento: 'Sargento Ortega',
    etapas: ['edchera', 'tafudart'],
    informe: ['Otro frente. Aquí no hay montaña: hay arena, dunas y el cauce seco de la Saguia el Hamra. El 13 de enero una bandera de la Legión cayó en una emboscada en Edchera y pagó muy cara la salida.',
      'Dos tiempos. Primero salimos de esa emboscada, resistimos en las dunas y limpiamos el cauce. Después, ya en febrero, volvemos con los carros M-24 del Pavía: batimos los puestos avanzados y asaltamos el poblado de Tafudart.',
      'En el poblado hay que registrar las casas. Con el cañón se abre brecha, pero no tiréis abajo una casa sin saber quién hay dentro.'],
    ordenes: ['Salir de la emboscada, rechazar la carga, resistir y limpiar el cauce', 'Con la sección de carros: batir los puestos avanzados y asaltar Tafudart']
  },
  {
    id: 'aire', tit: 'Alas sobre el Sáhara', dato: 'El Aaiún · febrero de 1958', sargento: 'Capitán jefe de patrulla',
    etapas: ['buchon1', 'buchon2'],
    informe: ['Señores, atentos. El 71 Escuadrón salió de la Península el 30 de enero con sus Buchones: célula de Messerschmitt, motor Merlin, dos cañones de veinte milímetros y ocho cohetes. Aquí no hay cazas enemigos. Nuestro trabajo es el ataque a tierra.',
      'Dos salidas. En la primera despegamos de El Aaiún y batimos dos posiciones que frenan a la columna. En la segunda apoyamos el asalto a un poblado fortificado. Y después hay que volver y tomar tierra.',
      'Entrad rasantes, tirad y salid. No os quedéis sobre el enemigo: tiran con todo lo que tienen y estos aviones ya no son jóvenes. Y ojo con el poblado, que hay civiles.'],
    ordenes: ['Despegar, batir la trinchera y los peñascos, y aterrizar', 'Batir los puestos avanzados, la trinchera y el poblado, y aterrizar']
  }
];
