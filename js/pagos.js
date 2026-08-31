(function () {
  "use strict";

  /**
   * ---------------------------------------------------------------
   * PAGO CON MERCADO PAGO
   * ---------------------------------------------------------------
   * Pegá acá la URL /exec de tu Google Apps Script (la misma que te da
   * Google al "Implementar > Nueva implementación > Aplicación web").
   * El código del script está en google-apps-script-mercadopago.gs.
   *
   * Mientras esto diga "PEGA_TU_URL_ACA" el botón de Mercado Pago NO
   * aparece y el sitio funciona igual que ahora, solo con WhatsApp.
   */
  var MP_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxeehDKvTB-HmC0hhvy5TAlu3YnN2zxziQgphq91PZ-CLKN1PWxb-IV4xL7fjc68MMx/exec";

  window.mwPagoConfigurado = MP_SCRIPT_URL.indexOf("PEGA_TU_URL") === -1;

  /**
   * Manda al comprador al checkout de Mercado Pago.
   *
   * Se hace con un formulario POST de verdad, no con fetch(), por dos motivos:
   *   1. Apps Script no acepta pedidos fetch desde otro dominio (CORS), así
   *      que no podríamos leer la respuesta.
   *   2. Un POST no deja el nombre y el mail escritos en la URL, donde
   *      quedarían guardados en el historial y en los logs del navegador.
   *
   * El navegador viaja al Apps Script, ese crea la preferencia de pago con
   * tu token (que vive solo en el servidor) y redirige a Mercado Pago.
   *
   * OJO: mandamos el id del pack, NUNCA el precio. El precio lo pone el
   * script desde su propia tabla. Si viajara en el formulario, cualquiera
   * podría editarlo desde el navegador y pagar $1.
   */
  window.mwPagarConMercadoPago = function (datos) {
    if (!window.mwPagoConfigurado) return false;

    var form = document.createElement("form");
    form.method = "POST";
    form.action = MP_SCRIPT_URL;
    form.style.display = "none";

    var campos = {
      action: "pagar",
      pack_id: datos.packId,
      nombre: datos.nombre,
      email: datos.email,
    };

    Object.keys(campos).forEach(function (nombre) {
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = nombre;
      input.value = campos[nombre];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    return true;
  };
})();
