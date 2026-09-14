(function () {
  "use strict";

  /* ---------- Configuración editable ---------- */
  var CONFIG = {
    businessName: "MayoristasYa",
    whatsappNumber: "5491128520849",
    whatsappDefaultMessage: "Hola! Quería hacer una consulta sobre los packs de proveedores de MayoristasYa.",
    transfer: {
      alias: "calabria.lautaro",
      cbu: "0000168300000028167293",
      titular: "Gisela Angela Calabria",
    },
  };

  var WSP_URL = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(CONFIG.whatsappDefaultMessage);

  document.querySelectorAll(".js-wsp").forEach(function (el) {
    el.setAttribute("href", WSP_URL);
    el.addEventListener("click", function () {
      if (window.mwTrack) window.mwTrack("contact_click", { method: "whatsapp" });
    });
  });

  document.querySelectorAll(".footer-social a[href^='http']").forEach(function (el) {
    el.addEventListener("click", function () {
      if (!window.mwTrack) return;
      var network = el.getAttribute("href").indexOf("instagram") !== -1 ? "instagram" : "tiktok";
      window.mwTrack("social_click", { network: network });
    });
  });

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Barra de progreso de scroll + header ---------- */
  var scrollProgress = document.getElementById("scrollProgress");
  var siteHeader = document.getElementById("siteHeader");

  function onScroll() {
    if (siteHeader) siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
    if (scrollProgress) {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      scrollProgress.style.width = pct + "%";
    }
    if (backToTop) backToTop.classList.toggle("is-visible", window.scrollY > 600);
  }

  /* ---------- Botón volver arriba ---------- */
  var backToTop = document.getElementById("backToTop");
  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();


  /* ---------- Modal info Negocio Mayorista ---------- */
  var negocioInfoBtn = document.getElementById("negocioInfoBtn");
  var negocioInfoModal = document.getElementById("negocioInfoModal");
  var negocioInfoBackdrop = document.getElementById("negocioInfoBackdrop");
  var negocioInfoClose = document.getElementById("negocioInfoClose");

  function openNegocioInfo() {
    if (!negocioInfoModal) return;
    negocioInfoModal.classList.add("is-open");
    if (negocioInfoBackdrop) negocioInfoBackdrop.classList.add("is-open");
    negocioInfoModal.setAttribute("aria-hidden", "false");
  }

  function closeNegocioInfo() {
    if (!negocioInfoModal) return;
    negocioInfoModal.classList.remove("is-open");
    if (negocioInfoBackdrop) negocioInfoBackdrop.classList.remove("is-open");
    negocioInfoModal.setAttribute("aria-hidden", "true");
  }

  if (negocioInfoBtn) negocioInfoBtn.addEventListener("click", openNegocioInfo);
  if (negocioInfoClose) negocioInfoClose.addEventListener("click", closeNegocioInfo);
  if (negocioInfoBackdrop) negocioInfoBackdrop.addEventListener("click", closeNegocioInfo);

  /* ---------- Menú mobile ---------- */
  var navToggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");

  function closeNav() {
    if (!navToggle || !mobileNav) return;
    navToggle.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      mobileNav.classList.toggle("is-open");
      document.body.classList.toggle("nav-open");
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeNav();
      closeNegocioInfo();
    }
  });

  /* ---------- FAQ acordeón ---------- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var question = item.querySelector(".faq-question");
    var answer = item.querySelector(".faq-answer");

    question.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");

      document.querySelectorAll(".faq-item.is-open").forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove("is-open");
          openItem.querySelector(".faq-question").setAttribute("aria-expanded", "false");
          openItem.querySelector(".faq-answer").style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove("is-open");
        question.setAttribute("aria-expanded", "false");
        answer.style.maxHeight = null;
      } else {
        item.classList.add("is-open");
        question.setAttribute("aria-expanded", "true");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------- Contadores animados ----------
     Los usan las tarjetas de números y también el +1000 de la portada. Ese
     lleva data-prefijo="+" y data-formato="plano" porque se escribe "+1000"
     y no "1.000": el punto de los miles ahí quedaría raro. */
  var counters = document.querySelectorAll("[data-count]");

  function escribirNumero(el, valor, decimals) {
    var prefijo = el.getAttribute("data-prefijo") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var texto;
    if (decimals > 0) texto = valor.toFixed(decimals);
    else if (el.getAttribute("data-formato") === "plano") texto = String(Math.floor(valor));
    else texto = Math.floor(valor).toLocaleString("es-AR");
    el.textContent = prefijo + texto + suffix;
  }

  function animateCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals"), 10) || 0;
    var duration = 1400;
    var start = null;

    /* Le reservamos el ancho que va a tener al final, antes de empezar.
       Sin esto el +1000 de la portada, que está centrado, se corría más de
       cien píxeles de costado mientras contaba: "+0" ocupa mucho menos que
       "+1000". Es un piso, no un techo: al terminar se saca, así el número
       vuelve a acomodarse solo si se gira el celular. */
    /* offsetWidth y no getBoundingClientRect: el número entra con una
       animación que lo achica un poco, y el rect devuelve ese tamaño
       achicado. offsetWidth ignora la animación y da el ancho de verdad. */
    var ancho = el.offsetWidth;
    if (ancho) el.style.minWidth = ancho + "px";

    function step(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      escribirNumero(el, eased * target, decimals);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        escribirNumero(el, target, decimals);
        el.style.minWidth = "";
      }
    }
    window.requestAnimationFrame(step);
  }

  if (counters.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      counters.forEach(function (el) {
        escribirNumero(el, parseFloat(el.getAttribute("data-count")),
          parseInt(el.getAttribute("data-decimals"), 10) || 0);
      });
    } else {
      /* El número arranca a contar cuando aparece en pantalla. Para el que
         viaja adentro de un carrusel eso no alcanza: el carrusel lo va
         corriendo de costado y, si para cuando bajás ya salió por la
         izquierda, no "aparece" nunca y se queda en cero mientras sus copias
         muestran el número final. A esos los disparamos cuando aparece el
         carrusel entero, que sí está quieto. */
      var counterObserver = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            obs.unobserve(entry.target);
            if (entry.target.hasAttribute("data-count")) {
              animateCounter(entry.target);
            } else {
              entry.target.querySelectorAll("[data-count]").forEach(animateCounter);
            }
          });
        },
        { threshold: 0.35 }
      );

      var carruselesVistos = [];
      counters.forEach(function (el) {
        var carrusel = el.closest ? el.closest(".marquesina") : null;
        if (!carrusel) {
          counterObserver.observe(el);
          return;
        }
        if (carruselesVistos.indexOf(carrusel) > -1) return;
        carruselesVistos.push(carrusel);
        counterObserver.observe(carrusel);
      });
    }
  }

  /* ---------- Formas de pago: plegado solo en celular ----------
     En el HTML va abierto a propósito: si el JavaScript no corre, el visitante
     igual ve todas las formas de pago. Acá lo cerramos únicamente en pantallas
     chicas, donde se comía una pantalla entera. Si el visitante lo toca, esa
     decisión manda y no se la volvemos a cambiar. */
  var mediosDetalle = document.getElementById("mediosDetalle");
  if (mediosDetalle && window.matchMedia) {
    var anchoGrande = window.matchMedia("(min-width: 760px)");
    var loTocoElUsuario = false;

    /* Escuchamos el click del summary y no el evento "toggle": toggle también
       se dispara cuando lo abrimos nosotros, y encima llega asincrónico. */
    var resumenMedios = mediosDetalle.querySelector("summary");
    if (resumenMedios) {
      resumenMedios.addEventListener("click", function () {
        loTocoElUsuario = true;
      });
    }

    var ajustarMedios = function (mq) {
      if (loTocoElUsuario) return;
      mediosDetalle.open = mq.matches;
    };

    ajustarMedios(anchoGrande);
    if (anchoGrande.addEventListener) {
      anchoGrande.addEventListener("change", ajustarMedios);
    } else if (anchoGrande.addListener) {
      anchoGrande.addListener(ajustarMedios);
    }
  }

  /* ---------- Anuncio flotante rotativo ----------
     Acá viven los anunciantes. Para sumar uno que compró el Espacio
     Publicitario, copiá un bloque y completá los datos: no hay que tocar
     nada más. Van rotando de a uno por aparición, así todos se muestran.

     Si lo cierran con la X no vuelve en toda la visita, y como mucho aparece
     TOPE_APARICIONES veces: alguien que lleva diez minutos leyendo está por
     comprar, y volver a interrumpirlo cuesta más de lo que rinde. */
  var ANUNCIANTES = [
    {
      ini: "CI",
      nombre: "Cala Imports",
      rubro: "Tecnología por mayor",
      etiqueta: "Contacto gratis",
      texto:
        "Un proveedor real del pack, para que veas cómo vienen. Importá al precio más bajo del mercado.",
      web: "https://calaimports.shop",
      telefono: "11 5513-5537",
      whatsapp: "5491155135537",
    },
  ];

  var anuncio = document.getElementById("anuncioFlotante");

  if (anuncio && ANUNCIANTES.length) {
    var ESPERA_PRIMERA = 15000; /* cuánto tarda en asomar la primera vez */
    var DURACION = 20000; /* cuánto se queda en pantalla */
    var INTERVALO = 180000; /* cada cuánto vuelve (3 minutos) */
    var TOPE_APARICIONES = 3; /* máximo por visita */

    var CLAVE = "mwAnuncioCerrado";
    var cerradoAMano = false;
    var apariciones = 0;
    var proximo = 0;

    /* sessionStorage puede tirar error en modo privado: no vale romper la
       página por un anuncio. */
    try {
      cerradoAMano = window.sessionStorage.getItem(CLAVE) === "1";
    } catch (e) {
      cerradoAMano = false;
    }

    var temporizador = null;
    var cicloAnuncio = null;

    var elIni = anuncio.querySelector(".af-ini");
    var elNombre = anuncio.querySelector(".af-id strong");
    var elRubro = anuncio.querySelector(".af-id span");
    var elEtiqueta = anuncio.querySelector(".af-gratis");
    var elTexto = anuncio.querySelector(".af-texto-cuerpo");
    var elWeb = anuncio.querySelector(".af-btn-fuerte");
    var elTel = anuncio.querySelector(".af-btn-tel");
    var elTelTexto = anuncio.querySelector(".af-tel-texto");

    /* Carga en la tarjeta los datos del anunciante que toca */
    function pintarAnunciante(a) {
      elIni.textContent = a.ini;
      elNombre.textContent = a.nombre;
      elRubro.textContent = "Publicidad · " + a.rubro;
      elEtiqueta.textContent = a.etiqueta;
      elTexto.textContent = a.texto;
      elWeb.setAttribute("href", a.web);
      elTelTexto.textContent = a.telefono;
      elTel.setAttribute(
        "href",
        "https://wa.me/" +
          a.whatsapp +
          "?text=" +
          encodeURIComponent("Hola! Los encontré en MayoristasYa y quería consultar precios.")
      );
    }

    /* En celular la notificación baja desde arriba, justo donde vive el header
       sticky. Con un valor fijo se superponían, así que medimos el header en
       vivo: cambia de alto según haya banner de oferta o no, y según si el
       visitante ya scrolleó. */
    function acomodarBajoElHeader() {
      if (window.innerWidth > 760) {
        anuncio.style.top = "";
        return;
      }
      var header = document.getElementById("siteHeader");
      var abajoDelHeader = header ? header.getBoundingClientRect().bottom : 0;
      anuncio.style.top = Math.max(abajoDelHeader, 0) + 10 + "px";
    }

    /* Mientras está a la vista lo seguimos: al scrollear, el banner de oferta
       se va y el header sube, así que la posición correcta cambia. */
    window.addEventListener(
      "scroll",
      function () {
        if (anuncio.classList.contains("esta-visible")) acomodarBajoElHeader();
      },
      { passive: true }
    );

    window.addEventListener("resize", function () {
      if (anuncio.classList.contains("esta-visible")) acomodarBajoElHeader();
    });

    function frenarCiclo() {
      if (temporizador) window.clearTimeout(temporizador);
      if (cicloAnuncio) window.clearInterval(cicloAnuncio);
      temporizador = null;
      cicloAnuncio = null;
    }

    function ocultarAnuncio() {
      anuncio.classList.remove("esta-visible");
      /* El hidden se pone recién cuando terminó de desvanecerse, si no
         desaparece de golpe sin animación. */
      window.setTimeout(function () {
        if (!anuncio.classList.contains("esta-visible")) anuncio.hidden = true;
      }, 450);
    }

    function mostrarAnuncio() {
      if (cerradoAMano) return;

      if (apariciones >= TOPE_APARICIONES) {
        frenarCiclo();
        return;
      }

      pintarAnunciante(ANUNCIANTES[proximo % ANUNCIANTES.length]);
      proximo++;
      apariciones++;

      anuncio.hidden = false;
      acomodarBajoElHeader();
      /* Dos cuadros para que el navegador registre el estado inicial y la
         transición se vea; si no, aparece de golpe sin animar. */
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          anuncio.classList.add("esta-visible");
        });
      });

      temporizador = window.setTimeout(ocultarAnuncio, DURACION);
    }

    document.getElementById("anuncioCerrar").addEventListener("click", function () {
      cerradoAMano = true;
      frenarCiclo();
      ocultarAnuncio();
      try {
        window.sessionStorage.setItem(CLAVE, "1");
      } catch (e) {
        /* modo privado: se pierde al recargar y no pasa nada */
      }
    });

    if (!cerradoAMano) {
      window.setTimeout(function () {
        mostrarAnuncio();
        cicloAnuncio = window.setInterval(mostrarAnuncio, INTERVALO);
      }, ESPERA_PRIMERA);
    }
  }


  /* ---------- Carruseles: caminan solos y se pueden empujar con el dedo ----------

     El CSS los movía con una animación, que no se puede tocar. Acá los movemos
     nosotros cuadro a cuadro: así el dedo puede empujarlos, soltarlos con
     envión, y cuando se queda quieto el carrusel sigue caminando solo.

     EL TRUCO DEL LOOP: en el HTML el contenido está tres veces. Corremos la
     pista y, cuando avanzó un grupo entero, le restamos ese ancho y volvemos
     al principio. Como lo que queda en pantalla es idéntico, el salto no se
     ve. Por eso el desplazamiento siempre se guarda entre 0 y un grupo. */
  var marquesinas = document.querySelectorAll(".marquesina");

  function armarMarquesina(caja) {
    var pista = caja.querySelector(".marquesina-pista");
    if (!pista || pista.children.length < 3) return;

    /* Cuánto tarda en recorrer un grupo. La verdad sigue estando en el CSS:
       la leemos de ahí para no tener el número escrito en dos lados. */
    var segundos = parseFloat(window.getComputedStyle(pista).animationDuration) || 40;

    caja.classList.add("js-arrastrable");

    var periodo = 0;      /* ancho de un grupo, en píxeles */
    var x = 0;            /* cuánto está corrida la pista */
    var velocidad = 0;    /* px por segundo del envión de la mano */
    var arrastrando = false;
    var quietoHasta = 0;  /* mientras no llegue esta hora, no camina solo */
    var ultimoX = 0;
    var ultimoT = 0;
    var cuadro = null;
    var desdeX = 0;       /* dónde empezó el arrastre */
    var movio = false;    /* ¿fue un arrastre o un toque? */

    /* El ancho de un grupo se mide sumando el tercio de tarjetas de adelante,
       con su separación. Medirlo así (y no con scrollWidth/3) evita que un
       redondeo de medio píxel se acumule vuelta a vuelta. */
    function medir() {
      var hijos = pista.children;
      var corte = Math.round(hijos.length / 3);
      var total = 0;
      for (var i = 0; i < corte; i++) {
        var estilo = window.getComputedStyle(hijos[i]);
        total += hijos[i].getBoundingClientRect().width + (parseFloat(estilo.marginRight) || 0);
      }
      periodo = total;
    }

    function acomodar() {
      if (periodo <= 0) return;
      x = ((x % periodo) + periodo) % periodo;
      pista.style.transform = "translate3d(" + -x + "px, 0, 0)";
    }

    function seDetiene() {
      /* Con el mouse encima se frena para poder leer, igual que antes.
         En celular no existe el "encima", así que no molesta. */
      return arrastrando || caja.matches(":hover") || Date.now() < quietoHasta;
    }

    function paso(ahora) {
      cuadro = window.requestAnimationFrame(paso);
      if (!ultimoT) ultimoT = ahora;
      var dt = Math.min((ahora - ultimoT) / 1000, 0.05); /* pestaña de fondo: sin saltos */
      ultimoT = ahora;
      if (periodo <= 0) { medir(); return; }

      if (arrastrando) return;

      if (velocidad) {
        /* Envión: se va apagando solo */
        x += velocidad * dt;
        velocidad *= Math.pow(0.0018, dt);
        if (Math.abs(velocidad) < 12) velocidad = 0;
      } else if (!seDetiene()) {
        x += (periodo / segundos) * dt;
      }
      acomodar();
    }

    /* ---- El dedo (y el mouse, que va por el mismo camino) ---- */
    function empezar(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      arrastrando = true;
      velocidad = 0;
      ultimoX = e.clientX;
      desdeX = e.clientX;
      movio = false;
      ultimoT = 0;
      caja.classList.add("arrastrando");
      try { caja.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    }

    function mover(e) {
      if (!arrastrando) return;
      var dx = e.clientX - ultimoX;
      ultimoX = e.clientX;
      if (Math.abs(e.clientX - desdeX) > 6) movio = true;
      x -= dx;
      /* Velocidad del último tramo, para el envión al soltar */
      var ahora = performance.now();
      if (ultimoT) {
        var dt = (ahora - ultimoT) / 1000;
        if (dt > 0.004) velocidad = -dx / dt;
      }
      ultimoT = ahora;
      acomodar();
    }

    function soltar(e) {
      if (!arrastrando) return;
      arrastrando = false;
      caja.classList.remove("arrastrando");
      try { caja.releasePointerCapture(e.pointerId); } catch (err) { /* nada */ }
      velocidad = Math.max(-2600, Math.min(2600, velocidad));
      if (Math.abs(velocidad) < 60) velocidad = 0;
      ultimoT = 0;
      /* Un respiro antes de volver a caminar solo: si arranca en el mismo
         instante en que soltás, parece que se te escapó de la mano. */
      quietoHasta = Date.now() + 1500;
    }

    caja.addEventListener("pointerdown", empezar);
    caja.addEventListener("pointermove", mover);
    caja.addEventListener("pointerup", soltar);
    caja.addEventListener("pointercancel", soltar);

    /* Un arrastre no tiene que abrir el link que quedó abajo del dedo.
       Un toque sin movimiento sí: por eso se mira si de verdad se movió. */
    caja.addEventListener("click", function (e) {
      if (movio) {
        e.preventDefault();
        e.stopPropagation();
        movio = false;
      }
    }, true);

    caja.addEventListener("dragstart", function (e) { e.preventDefault(); });

    /* Al girar el celular o cambiar el ancho, el grupo mide otra cosa */
    var remedir = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(remedir);
      remedir = window.setTimeout(function () { medir(); acomodar(); }, 200);
    });

    medir();
    /* Las fuentes cambian el ancho de las tarjetas al terminar de cargar */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { medir(); acomodar(); });
    }
    window.addEventListener("load", function () { medir(); acomodar(); });

    function arrancar() { if (!cuadro) { ultimoT = 0; cuadro = window.requestAnimationFrame(paso); } }
    function frenar() { if (cuadro) { window.cancelAnimationFrame(cuadro); cuadro = null; } }

    /* Con la pestaña de fondo no gastamos batería dibujando nada */
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") arrancar();
      else frenar();
    });

    arrancar();
  }

  if (marquesinas.length && window.PointerEvent && window.requestAnimationFrame) {
    /* Si alguien pidió menos movimiento, el CSS ya lo deja deslizable a mano:
       no lo pisamos con una animación que no quiere ver. */
    if (!reduceMotion) {
      Array.prototype.forEach.call(marquesinas, armarMarquesina);
    }
  }

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
