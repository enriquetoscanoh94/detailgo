/**
 * DetailGO — mapa de zonas de servicio.
 *
 * Dibuja el area de Los Angeles con las ciudades de cobertura marcadas con
 * circulos rojos semitransparentes. Usa Leaflet (auto-alojado en /vendor) y
 * tiles oscuros de CartoDB, para respetar el CSP (`script-src 'self'`,
 * `img-src ... https:`). Script plano no-modulo con defer, sin JS inline.
 */
(function () {
  'use strict';

  // [lat, lng] aproximado de cada ciudad de cobertura.
  var CITIES = [
    [34.39, -118.54], [34.44, -118.60], [34.42, -118.54], [34.38, -118.53], [34.42, -118.44], // Santa Clarita valley
    [34.22, -118.37], // Sun Valley
    [34.16, -118.50], [34.16, -118.53], // Encino
    [34.14, -118.66], // Calabasas
    [34.20, -118.54], // Reseda
    [34.20, -118.60], // Canoga Park
    [34.26, -118.60], // Chatsworth
    [34.28, -118.56], // Porter Ranch
    [34.27, -118.50], // Granada Hills
    [34.31, -118.44], // Sylmar
    [34.28, -118.42], // Pacoima
    [34.28, -118.44], // San Fernando
    [34.22, -118.44], // Panorama City
    [34.19, -118.45], // Van Nuys
    [34.17, -118.38], // North Hollywood
    [34.16, -118.39], // Valley Village
    [34.15, -118.45], // Sherman Oaks
    [34.17, -118.55], // Tarzana
    [34.14, -118.39], // Studio City
    [34.18, -118.31], // Burbank
    [34.14, -118.25], // Glendale
    [34.15, -118.14], // Pasadena
    [34.25, -118.28], // Tujunga
    [34.23, -118.24], // La Crescenta
    [34.21, -118.23], // Montrose
    [34.20, -118.20], // La Canada Flintridge
    [34.11, -118.29], // Los Feliz
    [34.08, -118.26], // Echo Park
    [34.11, -118.19], // Highland Park
    [34.10, -118.33], // Hollywood
    [34.04, -118.24], // Downtown LA
    [34.07, -118.40], // Beverly Hills
    [34.02, -118.49], // Santa Monica
    [34.02, -118.39], // Culver City
    [34.09, -118.36], // West Hollywood
    [34.06, -118.44], // Westwood
    [34.27, -118.78]  // Simi Valley
  ];

  // Envolvente convexa (monotone chain). Puntos [lat, lng] -> x=lng, y=lat.
  function convexHull(points) {
    var pts = points.slice().sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
    function cross(o, a, b) {
      return (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
    }
    var lower = [];
    for (var i = 0; i < pts.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
      lower.push(pts[i]);
    }
    var upper = [];
    for (var j = pts.length - 1; j >= 0; j--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[j]) <= 0) upper.pop();
      upper.push(pts[j]);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  // Expande el contorno hacia afuera desde el centro, para dar margen a las
  // ciudades del borde (que la mancha las cubra, no que queden en la orilla).
  function expand(hull, factor) {
    var cx = 0, cy = 0;
    for (var i = 0; i < hull.length; i++) { cy += hull[i][0]; cx += hull[i][1]; }
    cy /= hull.length; cx /= hull.length;
    return hull.map(function (p) {
      return [cy + (p[0] - cy) * factor, cx + (p[1] - cx) * factor];
    });
  }

  function init() {
    var el = document.getElementById('zonesMap');
    if (!el || typeof L === 'undefined') return;

    var map = L.map(el, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true
    }).setView([34.18, -118.40], 9);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18
    }).addTo(map);

    // Una sola mancha roja translucida que abarca TODAS las zonas.
    var blob = expand(convexHull(CITIES), 1.14);
    var area = L.polygon(blob, {
      color: '#ff4d4d',
      weight: 2,
      opacity: 0.55,
      fillColor: '#ff2d2d',
      fillOpacity: 0.25,
      lineJoin: 'round'
    }).addTo(map);

    map.fitBounds(area.getBounds(), { padding: [30, 30] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
