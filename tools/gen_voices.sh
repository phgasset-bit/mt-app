#!/bin/bash
# Genera los gritos del juego con Piper (voces neuronales es-ES) y los procesa con ffmpeg.
# Uso: tools/gen_voices.sh   (requiere: pip install piper-tts, ffmpeg, modelos en tools/voices/)
set -e
cd "$(dirname "$0")"
OUT=../www/audio; TMP=$(mktemp -d); mkdir -p $OUT
M1=voices/m_carlfm-x-low/es-carlfm-x-low.onnx
M2=voices/m_mls_10246-low/es-mls_10246-low.onnx
M3=voices/m_mls_9972-low/es-mls_9972-low.onnx
SHOUT="highpass=f=180,equalizer=f=2600:t=q:w=1:g=7,acompressor=threshold=-24dB:ratio=8:attack=3:release=80:makeup=6,volume=2.2,alimiter=limit=0.9,aecho=0.8:0.5:90|210:0.22|0.12"
say(){ # modelo texto salida velocidad
  echo "$2" | python3 -m piper -m $1 -f $3 --length-scale $4 --noise-scale 0.8 2>/dev/null
}
solo(){ # clave modelo pitch texto
  say $2 "$4" $TMP/a.wav 0.92
  ffmpeg -v error -y -i $TMP/a.wav -af "aresample=22050,asetrate=22050*$3,aresample=22050,atempo=1/$3*1.02,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,$SHOUT" -ac 1 -b:a 64k $OUT/$1.mp3
}
coro(){ # clave texto : varias voces a la vez, como una sección entera
  say $M1 "$2" $TMP/1.wav 0.95; say $M2 "$2" $TMP/2.wav 0.9; say $M3 "$2" $TMP/3.wav 0.9; say $M1 "$2" $TMP/4.wav 1.0
  T="silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
  ffmpeg -v error -y -i $TMP/1.wav -i $TMP/2.wav -i $TMP/3.wav -i $TMP/4.wav -i $TMP/1.wav -i $TMP/4.wav -filter_complex "
   [0]$T,aresample=22050,asetrate=22050*1.12,aresample=22050,atempo=0.92[a];
   [1]$T,aresample=22050,asetrate=22050*0.70,aresample=22050,atempo=1.40,volume=0.6,adelay=50[b];
   [2]$T,aresample=22050,asetrate=22050*0.74,aresample=22050,atempo=1.33,volume=0.6,adelay=90[c];
   [3]$T,aresample=22050,asetrate=22050*0.90,aresample=22050,atempo=1.10,adelay=30[d];
   [4]$T,aresample=22050,asetrate=22050*1.03,aresample=22050,atempo=0.99,adelay=70[e];
   [5]$T,aresample=22050,asetrate=22050*0.82,aresample=22050,atempo=1.2,adelay=110[f];
   [a][b][c][d][e][f]amix=inputs=6:normalize=0,volume=0.6,$SHOUT" -ac 1 -b:a 64k $OUT/$1.mp3
}
solo viva_espana   $M1 1.12 "¡Viva España!"
solo viva_legion   $M1 1.12 "¡Viva la Legión!"
solo a_mi          $M1 1.15 "¡A mí la Legión!"
solo adelante      $M1 1.10 "¡Adelante, legionarios!"
solo asalto        $M1 1.12 "¡Al asalto!"
solo fuego         $M1 1.10 "¡Fuego!"
solo granada       $M1 0.93 "¡Granada!"
solo recargando    $M1 0.90 "¡Recargando!"
solo cubridme      $M1 1.04 "¡Cubridme!"
solo enemigo       $M1 0.96 "¡Enemigo a la vista!"
solo herido        $M1 0.88 "¡Me han dado!"
solo sanitario     $M1 1.06 "¡Sanitario!"
solo tomada        $M1 1.10 "¡Posición tomada!"
solo aviacion      $M1 0.95 "¡Aviación! ¡Cuerpo a tierra!"
solo emboscada     $M1 1.00 "¡Emboscada!"
coro coro_viva     "¡Viva!"
coro coro_espana   "¡Viva España!"
coro coro_legion   "¡Viva la Legión!"
coro coro_luchar   "¡Legionarios, a luchar! ¡Legionarios, a morir!"
rm -rf $TMP; ls -la $OUT
