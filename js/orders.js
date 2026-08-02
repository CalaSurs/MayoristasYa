(function () {
  "use strict";

  /**
   * Pegá acá la URL de tu Google Apps Script Web App (la que te da Google
   * al "Implementar" el script como aplicación web). Instrucciones completas
   * en la respuesta del chat donde se armó este archivo.
   *
   * Mientras esto diga "PEGA_TU_URL_ACA", el sitio funciona exactamente
   * igual que antes: el checkout y el WhatsApp no se tocan, simplemente
   * no se guarda un registro del pedido en tu planilla.
   */
  var ORDERS_WEBHOOK_URL = "PEGA_TU_URL_ACA";

  var isConfigured = ORDERS_WEBHOOK_URL.indexOf("PEGA_TU_URL_ACA") === -1;

  /* Envía el pedido a la planilla de Google Sheets. Es "fire and forget":
     si falla (sin internet, script mal pegado, etc.) no interrumpe la
     compra ni el redirect a WhatsApp. */
  window.mwSendOrder = function (order) {
    if (!isConfigured) return;
    try {
      fetch(ORDERS_WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(order),
      }).catch(function () {
        /* silencioso a propósito */
      });
    } catch (e) {
      /* silencioso a propósito */
    }
  };
})();
