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

  /**
   * Un identificador al azar, distinto para cada compra.
   *
   * POR QUÉ HACE FALTA: más abajo el formulario se manda DOS veces (el intento
   * normal y el plan B). Sin esto, el script anotaba el pedido las dos veces y
   * la misma compra aparecía duplicada en la planilla. Como los dos envíos
   * llevan el mismo token, el script reconoce que es una sola compra.
   */
  function nuevoToken() {
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        var a = new Uint8Array(8);
        window.crypto.getRandomValues(a);
        var s = "";
        for (var i = 0; i < a.length; i++) s += (a[i] + 256).toString(16).slice(1);
        return s;
      }
    } catch (e) {
      /* seguimos con el plan de abajo */
    }
    return (
      Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    ).replace(/[^a-z0-9]/g, "");
  }

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
      token: datos.token,
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

    /* Se calcula una sola vez y lo comparten los dos envíos de abajo */
    var envio = {
      packId: datos.packId,
      nombre: datos.nombre,
      email: datos.email,
      token: nuevoToken(),
    };

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

    crearFormulario(envio, nombreFrame).submit();

    /* Plan B: si en 9 segundos no llegó el link, navegamos a Apps Script
       como antes. Peor experiencia, pero la venta no se pierde. Va con el
       mismo token, así el pedido queda anotado una sola vez. */
    window.setTimeout(function () {
      if (listo) return;
      listo = true;
      window.removeEventListener("message", alRecibir);
      crearFormulario(envio, null).submit();
    }, ESPERA_MS);

    return true;
  };
})();
