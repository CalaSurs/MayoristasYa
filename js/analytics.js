(function () {
  "use strict";

  /**
   * Reemplazá este valor por tu ID de medición real de Google Analytics (GA4).
   * Se obtiene gratis en https://analytics.google.com
   * Administrar > Flujos de datos > tu flujo web > "ID de medición" (empieza con "G-").
   * Este mismo archivo se usa en index.html, privacidad.html y terminos.html,
   * así que alcanza con cambiarlo una sola vez acá.
   */
  var GA_MEASUREMENT_ID = "G-WN8KR754EJ";

  var isConfigured = GA_MEASUREMENT_ID.indexOf("XXXXXXXXXX") === -1;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;

  if (isConfigured) {
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
    document.head.appendChild(script);

    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID);
  }

  /* Helper seguro para trackear eventos personalizados desde main.js.
     Si todavía no configuraste tu ID, no hace nada (no rompe el sitio). */
  window.mwTrack = function (eventName, params) {
    if (!isConfigured) return;
    window.gtag("event", eventName, params || {});
  };
})();
