(function () {
  "use strict";

  /**
   * ---------------------------------------------------------------
   * PAGO CON MERCADO PAGO
   * ---------------------------------------------------------------
   * URL /exec de tu Google Apps Script. El código está en
   * google-apps-script-mercadopago.gs.
   *
   * Mientras diga "PEGA_TU_URL_ACA" el botón de pago no aparece y el
   * sitio funciona igual que ahora, solo con WhatsApp.
   */
  var MP_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxeehDKvTB-HmC0hhvy5TAlu3YnN2zxziQgphq91PZ-CLKN1PWxb-IV4xL7fjc68MMx/exec";

  window.mwPagoConfigurado = MP_SCRIPT_URL.indexOf("PEGA_TU_URL") === -1;

  /* Cuánto esperamos la respuesta del script antes de usar el plan B. */
  var ESPERA_MS = 9000;

  var enCurso = false;

  function crearFormulario(datos, target) {
    var form = document.createElement("form");
    form.method = "POST";
    form.action = MP_SCRIPT_URL;
    form.style.display = "none";
    if (target) form.target = target;

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
    return form;
  }

  /* Solo aceptamos que nos manden a Mercado Pago, a ningún otro lado. */
  function esUrlDeMercadoPago(url) {
    return typeof url === "string" && /^https:\/\/[a-z0-9.-]*mercadopago\.com(\.[a-z]{2})?\//i.test(url);
  }

  /**
   * Le pide al script el link de pago y manda al comprador a Mercado Pago.
   *
   * POR QUÉ ES TAN VUELTERO:
   * Apps Script muestra sus respuestas dentro de un iframe propio, y encima
   * le pega arriba un cartel de Google ("Un usuario de Apps Script creó esta
   * aplicación"). Si mandáramos al comprador directo ahí, vería ese cartel y
   * Mercado Pago cargaría apretado adentro del iframe.
   *
   * Entonces: mandamos el formulario a un iframe ESCONDIDO, el script nos
   * contesta el link por postMessage, y viajamos nosotros. El comprador nunca
   * ve Google: pasa de mayoristasya.com a mercadopago.com.ar y listo.
   *
   * Si algo de eso falla, a los 9 segundos usamos el camino viejo (navegar a
   * Apps Script) para que igual pueda pagar, aunque vea el cartel.
   */
  window.mwPagarConMercadoPago = function (datos) {
    if (!window.mwPagoConfigurado || enCurso) return false;
    enCurso = true;

    var nombreFrame = "mwPagoFrame";
    var iframe = document.createElement("iframe");
    iframe.name = nombreFrame;
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:absolute;width:0;height:0;border:0;left:-9999px";
    document.body.appendChild(iframe);

    var listo = false;

    function irAMercadoPago(url) {
      if (listo) return;
      listo = true;
      window.removeEventListener("message", alRecibir);
      window.location.href = url;
    }

    function alRecibir(e) {
      var d = e.data;
      if (!d || typeof d !== "object" || !esUrlDeMercadoPago(d.mwInitPoint)) return;
      irAMercadoPago(d.mwInitPoint);
    }

    window.addEventListener("message", alRecibir);

    crearFormulario(datos, nombreFrame).submit();

    /* Plan B: si en 9 segundos no llegó el link, navegamos a Apps Script
       como antes. Peor experiencia, pero la venta no se pierde. */
    window.setTimeout(function () {
      if (listo) return;
      listo = true;
      window.removeEventListener("message", alRecibir);
      crearFormulario(datos, null).submit();
    }, ESPERA_MS);

    return true;
  };
})();
