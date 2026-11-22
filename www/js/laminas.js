// Láminas de catálogo de las armas (SVG de perfil, boca a la derecha) para la armería.
const Laminas = (() => {
  let n = 0;
  function defs(id) {
    return '<defs>' +
      '<linearGradient id="mad' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8703f"/><stop offset=".45" stop-color="#7d4d26"/><stop offset="1" stop-color="#4e2c13"/></linearGradient>' +
      '<linearGradient id="met' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b7075"/><stop offset=".35" stop-color="#3a3e42"/><stop offset="1" stop-color="#16181a"/></linearGradient>' +
      '<linearGradient id="bri' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f969c"/><stop offset="1" stop-color="#2c3034"/></linearGradient>' +
      '<pattern id="vet' + id + '" width="40" height="6" patternUnits="userSpaceOnUse"><path d="M0 2 Q10 0 20 2 T40 2" stroke="#3b200c" stroke-opacity=".35" fill="none" stroke-width=".8"/></pattern>' +
      '<radialGradient id="som' + id + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
      '</defs>';
  }
  const M = id => 'url(#met' + id + ')', W = id => 'url(#mad' + id + ')', V = id => 'url(#vet' + id + ')', B = id => 'url(#bri' + id + ')';
  const madera = (id, d) => '<path d="' + d + '" fill="' + W(id) + '" stroke="#2a160a" stroke-width="1"/><path d="' + d + '" fill="' + V(id) + '"/>';
  const metal = (id, d, brillo) => '<path d="' + d + '" fill="' + (brillo ? B(id) : M(id)) + '" stroke="#0c0d0e" stroke-width=".8"/>';
  const agujeros = (x0, y, n, paso, r) => { let s = ''; for (let i = 0; i < n; i++) s += '<ellipse cx="' + (x0 + i * paso) + '" cy="' + y + '" rx="' + r * 1.4 + '" ry="' + r + '" fill="#050505"/>'; return s; };

  const DIBUJO = {
    mauser: id =>
      madera(id, 'M10 57 L24 54 L108 50 L126 51 L142 56 L150 58 L330 58 L332 64 L150 67 L132 69 L124 76 L116 77 L104 72 L58 84 L12 88 Z') +
      madera(id, 'M178 52 L322 52 L324 57 L176 57 Z') +
      metal(id, 'M8 56 L14 55 L16 88 L9 89 Z') +
      metal(id, 'M150 54.5 L392 54.5 L392 58 L150 58 Z', true) +
      metal(id, 'M124 48 L178 48 L178 58 L124 58 Z') +
      metal(id, 'M128 44.5 L172 44.5 L172 50 L128 50 Z', true) +
      metal(id, 'M150 49 Q160 52 158 62 L154 62 Q155 54 148 51 Z') + '<circle cx="156" cy="64" r="4" fill="' + B(id) + '" stroke="#0c0d0e" stroke-width=".8"/>' +
      metal(id, 'M140 67 L172 67 L172 71 L140 71 Z') +
      '<path d="M118 69 Q120 80 132 80 Q140 80 140 70" fill="none" stroke="#1d1f21" stroke-width="2.4"/><path d="M128 69 L127 77" stroke="#1d1f21" stroke-width="2"/>' +
      metal(id, 'M226 50 L234 50 L234 68 L226 68 Z', true) + metal(id, 'M298 50 L305 50 L305 67 L298 67 Z', true) +
      metal(id, 'M330 58 L344 58 L344 61 L330 61 Z') +
      metal(id, 'M384 48 L390 48 L390 54.5 L384 54.5 Z') + metal(id, 'M178 46 L190 46 L190 50 L178 50 Z') +
      '<circle cx="62" cy="83" r="2.5" fill="none" stroke="#2a2d30" stroke-width="1.4"/><circle cx="300" cy="69" r="2.5" fill="none" stroke="#2a2d30" stroke-width="1.4"/>',
    z45: id =>
      madera(id, 'M40 56 L52 53 L140 51 L156 52 L156 64 L144 66 L136 74 L124 74 L118 68 L92 74 L44 82 Z') +
      metal(id, 'M36 54 L42 53 L45 82 L38 83 Z') +
      metal(id, 'M150 49 L238 49 L238 60 L150 60 Z') +
      metal(id, 'M236 48 L332 48 L332 61 L236 61 Z', true) + agujeros(246, 54.5, 12, 7.5, 2) +
      metal(id, 'M332 50 L352 50 L354 59 L332 59 Z') + agujeros(337, 54.5, 3, 5.5, 1.3) +
      metal(id, 'M200 60 L216 60 L222 108 L206 108 Z') + '<path d="M204 66 L218 66 M205 76 L219 76 M206 86 L220 86 M207 96 L221 96" stroke="#0a0b0c" stroke-width=".7"/>' +
      madera(id, 'M156 60 L196 60 L196 66 L156 66 Z') +
      '<path d="M162 66 Q164 77 176 77 Q186 77 186 66" fill="none" stroke="#1d1f21" stroke-width="2.4"/><path d="M172 66 L171 74" stroke="#1d1f21" stroke-width="2"/>' +
      metal(id, 'M182 45 L196 45 L196 49 L182 49 Z') + metal(id, 'M346 44 L350 44 L350 50 L346 50 Z'),
    naranjero: id =>
      madera(id, 'M12 57 L26 54 L104 50 L122 51 L136 56 L144 58 L236 58 L238 65 L144 67 L128 69 L120 76 L112 77 L100 72 L56 84 L14 88 Z') +
      metal(id, 'M10 56 L16 55 L18 88 L11 89 Z') +
      metal(id, 'M140 48 L236 48 L236 58 L140 58 Z') +
      metal(id, 'M234 47 L330 47 L330 60 L234 60 Z', true) + agujeros(244, 53.5, 12, 7.5, 2.1) +
      metal(id, 'M330 51 L346 51 L346 57 L330 57 Z') +
      metal(id, 'M176 44 L196 44 L206 30 L232 30 L226 44 L236 44 L236 49 L176 49 Z') + '<path d="M184 44 L204 32 M196 44 L214 32 M208 44 L222 32" stroke="#0a0b0c" stroke-width=".7"/>' +
      '<path d="M114 69 Q116 80 128 80 Q136 80 136 70" fill="none" stroke="#1d1f21" stroke-width="2.4"/><path d="M124 69 L123 77" stroke="#1d1f21" stroke-width="2"/>' +
      metal(id, 'M150 45 L168 45 L168 48 L150 48 Z') + metal(id, 'M340 45 L344 45 L344 51 L340 51 Z'),
    fao: id =>
      madera(id, 'M10 54 L22 51 L92 50 L112 52 L112 66 L104 68 L82 74 L14 84 Z') +
      metal(id, 'M8 53 L13 52 L16 84 L9 85 Z') +
      madera(id, 'M118 64 L130 64 L136 90 L124 92 L120 76 Z') +
      metal(id, 'M108 48 L196 48 L196 64 L108 64 Z') +
      metal(id, 'M196 51 L372 51 L372 57 L196 57 Z', true) +
      metal(id, 'M196 58 L300 58 L300 62 L196 62 Z') +
      metal(id, 'M372 49 L392 47 L392 61 L372 59 Z') +
      metal(id, 'M200 49 L232 49 L232 53 L200 53 Z') + '<path d="M206 49 Q216 34 228 49" fill="none" stroke="#24272a" stroke-width="3"/>' +
      metal(id, 'M140 48 L148 14 L172 10 L170 48 Z') + '<path d="M148 22 L170 18 M146 30 L170 26 M144 38 L170 34" stroke="#0a0b0c" stroke-width=".7"/>' +
      metal(id, 'M300 62 L362 74 L362 77 L300 66 Z') + metal(id, 'M300 60 L364 68 L364 71 L300 64 Z') +
      '<path d="M112 64 Q114 75 124 74" fill="none" stroke="#1d1f21" stroke-width="2.4"/>' +
      metal(id, 'M384 43 L388 43 L388 50 L384 50 Z') + metal(id, 'M118 44 L130 44 L130 48 L118 48 Z'),
    cetme: id =>
      madera(id, 'M10 52 L118 52 L118 66 L92 70 L14 80 Z') +
      metal(id, 'M8 51 L13 51 L16 80 L9 81 Z') +
      metal(id, 'M118 48 L218 48 L218 64 L118 64 Z') +
      madera(id, 'M146 64 L160 64 L168 90 L154 92 L150 76 Z') +
      '<path d="M140 64 Q142 75 152 74" fill="none" stroke="#1d1f21" stroke-width="2.4"/><path d="M147 64 L146 71" stroke="#1d1f21" stroke-width="2"/>' +
      metal(id, 'M176 64 L198 64 L206 98 L184 100 Z') + '<path d="M180 72 L200 71 M182 82 L203 81 M184 92 L205 91" stroke="#0a0b0c" stroke-width=".7"/>' +
      madera(id, 'M218 50 L300 50 L300 64 L218 64 Z') +
      metal(id, 'M218 42 L330 42 L330 48 L218 48 Z', true) +
      metal(id, 'M300 53 L376 53 L376 58 L300 58 Z', true) +
      metal(id, 'M376 51 L392 51 L392 60 L376 60 Z') + '<path d="M380 51 L380 60 M384 51 L384 60 M388 51 L388 60" stroke="#0a0b0c" stroke-width=".7"/>' +
      '<circle cx="132" cy="44" r="6" fill="' + B(id) + '" stroke="#0c0d0e" stroke-width=".8"/>' +
      metal(id, 'M326 34 L332 34 L332 42 L326 42 Z') + metal(id, 'M200 44 L212 40 L212 48 L200 48 Z')
  };
  // lámina: el arma sobre fondo de catálogo, con sombra y una etiqueta de calibre
  function lamina(id, calibre) {
    const k = 'l' + (n++), d = DIBUJO[id]; if (!d) return '';
    return '<svg class="lamina" viewBox="0 0 400 112" role="img" aria-label="Ilustración del arma">' + defs(k) +
      '<ellipse cx="200" cy="100" rx="190" ry="7" fill="url(#som' + k + ')"/>' + d(k) +
      (calibre ? '<text x="392" y="106" text-anchor="end" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-size="11" fill="#d9b77a" letter-spacing="1">' + calibre + '</text>' : '') + '</svg>';
  }
  return { lamina };
})();
