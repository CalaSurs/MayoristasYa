(function () {
  "use strict";

  /**
   * ---------------------------------------------------------------
   * CHAT EN VIVO (Tawk.to)
   * ---------------------------------------------------------------
   * La URL sale del panel de Tawk: Administration > Chat Widget > "Widget
   * Code", de la línea s1.src = 'https://embed.tawk.to/XXXXXXXX/YYYYYYYY'.
   *
   * IMPORTANTE: el sitio NO usa la burbuja que trae Tawk, usa su propio
   * botón (.chat-float, abajo a la derecha). Este archivo esconde la de
   * Tawk apenas carga. Para que el globo "We are here!" no aparezca nunca,
   * apagalo también en el panel:
   *   Administration > Chat Widget > Attention Grabber > None / Off
   */
  var TAWK_EMBED_URL = "https://embed.tawk.to/6a9208f5ae1cfe3447e94415/1k15760ei";

  var isConfigured = TAWK_EMBED_URL.indexOf("PEGA_TU_URL") === -1;

  var floatBtn = null;
  var chatAbierto = false;
  var tawkListo = false;
  var tawkFallo = false;
  var abrirAlCargar = false;
  var esperaFallback = null;

  function abrirTawk() {
    chatAbierto = true;
    window.Tawk_API.showWidget();
    window.Tawk_API.maximize();
    if (window.mwTrack) window.mwTrack("chat_open", { method: "tawk" });
  }

  function abrirWhatsapp() {
    var wsp = document.querySelector(".js-wsp[href^='https']");
    if (wsp) window.open(wsp.getAttribute("href"), "_blank", "noopener");
  }

  function marcarCargando(activo) {
    if (floatBtn) floatBtn.classList.toggle("is-loading", activo);
  }

  /**
   * Abre el chat DENTRO de la página, nunca en una pestaña nueva.
   *
   * Tawk carga de forma asíncrona: si tocás el botón antes de que termine,
   * no hay que mandar a WhatsApp (eso abría otra pestaña), hay que esperar
   * y abrirlo apenas esté listo. WhatsApp queda solo como último recurso,
   * si el script realmente falló o tardó más de 8 segundos.
   */
  window.mwChatOpen = function () {
    if (tawkListo) {
      abrirTawk();
      return;
    }
    if (tawkFallo) {
      abrirWhatsapp();
      return;
    }

    abrirAlCargar = true;
    marcarCargando(true);

    if (!esperaFallback) {
      esperaFallback = window.setTimeout(function () {
        if (tawkListo) return;
        tawkFallo = true;
        abrirAlCargar = false;
        marcarCargando(false);
        abrirWhatsapp();
      }, 8000);
    }
  };

  /* Guarda los datos del comprador en la conversación, así cuando
     alguien escribe ya sabés quién es y qué pack estaba mirando. */
  window.mwChatSetVisitor = function (data) {
    if (!window.Tawk_API || typeof window.Tawk_API.setAttributes !== "function") return;
    try {
      window.Tawk_API.setAttributes(data, function () {
        /* silencioso a propósito */
      });
    } catch (e) {
      /* silencioso a propósito */
    }
  };

  if (!isConfigured) {
    tawkFallo = true;
    return;
  }

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();

  function ocultarBurbujaTawk() {
    if (window.Tawk_API && typeof window.Tawk_API.hideWidget === "function") {
      try {
        window.Tawk_API.hideWidget();
      } catch (e) {
        /* silencioso a propósito */
      }
    }
  }

  /* Usamos NUESTRO botón (.chat-float), no la burbuja que trae Tawk.
     Por eso la escondemos apenas carga: así no aparece el globo
     "We are here!" ni una segunda burbuja encima de la nuestra.

     El globo puede aparecer unos segundos DESPUÉS de que carga el widget,
     así que insistimos un rato. Dejamos de insistir apenas el visitante
     abre el chat, para no cerrárselo en la cara. */
  window.Tawk_API.onLoad = function () {
    tawkListo = true;
    ocultarBurbujaTawk();

    var intentos = 0;
    var reintento = setInterval(function () {
      if (chatAbierto || ++intentos > 10) {
        clearInterval(reintento);
        return;
      }
      ocultarBurbujaTawk();
    }, 500);

    /* Si el visitante ya había tocado el botón mientras cargaba,
       le abrimos el chat ahora sin que tenga que tocar de nuevo. */
    if (abrirAlCargar) {
      abrirAlCargar = false;
      marcarCargando(false);
      abrirTawk();
    }
  };

  /* Mientras la ventana de chat está abierta escondemos nuestro botón,
     para que no quede encima de la conversación. */
  window.Tawk_API.onChatMaximized = function () {
    if (floatBtn) floatBtn.classList.add("is-hidden");
  };

  /* Al cerrar el chat, Tawk vuelve a mostrar su burbuja: la escondemos
     otra vez y volvemos a mostrar la nuestra. */
  window.Tawk_API.onChatMinimized = function () {
    window.Tawk_API.hideWidget();
    if (floatBtn) floatBtn.classList.remove("is-hidden");
  };

  window.Tawk_API.onChatStarted = function () {
    if (window.mwTrack) window.mwTrack("chat_start", { method: "tawk" });
  };

  floatBtn = document.getElementById("chatFloat");
  if (floatBtn) floatBtn.addEventListener("click", window.mwChatOpen);

  var s = document.createElement("script");
  s.async = true;
  s.src = TAWK_EMBED_URL;
  s.charset = "UTF-8";
  s.setAttribute("crossorigin", "*");

  /* Solo si el script de verdad no se pudo bajar caemos a WhatsApp. */
  s.onerror = function () {
    tawkFallo = true;
    marcarCargando(false);
    if (abrirAlCargar) {
      abrirAlCargar = false;
      abrirWhatsapp();
    }
  };

  document.head.appendChild(s);
})();
