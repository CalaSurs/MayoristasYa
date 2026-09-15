(function () {
  "use strict";

  /* Los mismos datos que en index.html y en el Apps Script. El precio real
     lo pone el script del lado del servidor: esto es solo para mostrar. */
  var PACKS = {
    "100": {
      nombre: "Pack 100",
      desc: "100 proveedores verificados",
      precio: 4999,
      antes: 10000,
    },
    "500": {
      nombre: "Pack 500",
      desc: "500 proveedores en +15 rubros",
      precio: 14999,
      antes: 30000,
    },
    "1000": {
      nombre: "Pack 1000",
      desc: "+1000 proveedores en +25 rubros",
      precio: 19999,
      antes: 40000,
    },
    ebook: {
      nombre: "De 0 a tu primer millón",
      desc: "Ebook de 20 páginas, 17 capítulos",
      precio: 5000,
    },
    publicidad: {
      nombre: "Espacio Publicitario",
      desc: "Tu negocio publicado en MayoristasYa",
      precio: 24999,
      antes: 50000,
    },
    "negocio-mayorista": {
      nombre: "Negocio Mayorista",
      desc: "Tu propia página, con los 3 packs incluidos",
      precio: 130000,
      antes: 260000,
      mensual: true,
    },
  };

  var CONFIG = {
    businessName: "MayoristasYa",
    whatsappNumber: "5491128520849",
    transfer: {
      alias: "calabria.lautaro",
      cbu: "0000168300000028167293",
      titular: "Gisela Angela Calabria",
    },
  };

  function $(id) {
    return document.getElementById(id);
  }

  function formatPrice(n) {
    return "$" + n.toLocaleString("es-AR");
  }

  /* ---------- Qué pack vino en el link ---------- */
  var packId = new URLSearchParams(window.location.search).get("pack") || "";
  var pack = PACKS[packId];

  if (!pack) {
    $("ckSinPack").hidden = false;
    return;
  }

  $("ckContenido").hidden = false;
  document.title = "Comprar " + pack.nombre + " | MayoristasYa.com";

  /* ---------- Resumen ---------- */
  $("ckPackNombre").textContent = pack.nombre;
  $("ckPackDesc").textContent = pack.desc;
  $("ckPackPrecio").textContent = formatPrice(pack.precio);

  /* El total sube contando hasta el precio. Llama la atención al número
     justo cuando el visitante está decidiendo. */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var elTotal = $("ckTotal");

  if (reduceMotion) {
    elTotal.textContent = formatPrice(pack.precio);
  } else {
    elTotal.textContent = formatPrice(0);
    var inicio = null;
    var duracion = 700;

    function contar(t) {
      if (!inicio) inicio = t;
      var avance = Math.min((t - inicio) / duracion, 1);
      var suave = 1 - Math.pow(1 - avance, 3);
      elTotal.textContent = formatPrice(Math.round(suave * pack.precio));
      if (avance < 1) window.requestAnimationFrame(contar);
      else elTotal.textContent = formatPrice(pack.precio);
    }

    window.setTimeout(function () {
      window.requestAnimationFrame(contar);
    }, 250);
  }

  if (pack.antes && pack.antes > pack.precio) {
    $("ckPackAntes").textContent = formatPrice(pack.antes);
    $("ckLineaDesc").hidden = false;
    $("ckPackAhorro").textContent = "-" + formatPrice(pack.antes - pack.precio);
    $("ckLineaAhorro").hidden = false;
  }

  if (pack.mensual) $("ckMensual").hidden = false;

  /* ---------- Negocio Mayorista: la ficha de armado ----------
     Solo para este pack. Los otros son un archivo que se manda; este es una
     página que hay que construir, así que le preguntamos lo mínimo para
     arrancar y le mostramos un boceto que se arma con lo que va escribiendo. */
  var esNegocio = packId === "negocio-mayorista";
  var negNombre = $("ckNegNombre");
  var negWsp = $("ckNegWsp");
  var negDominio = $("ckNegDominio");
  var negColor = $("ckNegColor");
  var negLogo = $("ckNegLogo");
  var negNotas = $("ckNegNotas");

  /* Las redes que marcó, en el orden en que están en pantalla */
  function redesElegidas() {
    var puestas = [];
    document.querySelectorAll(".js-red").forEach(function (c) {
      if (c.checked) puestas.push(c.value);
    });
    return puestas;
  }

  if (esNegocio) {
    $("ckArmado").hidden = false;
    $("ckVista").hidden = false;
    $("ckTitulo").textContent = "Armemos tu negocio";
    $("ckSub").textContent =
      "Completá tus datos, contame cómo la querés y elegí cómo pagar. " +
      "Apenas entra el pago arranco con tu página.";

    var vistaMarca = $("ckVistaMarca");
    var vistaUrl = $("ckVistaUrl");
    var vistaRedes = $("ckVistaRedes");
    var navegador = document.querySelector(".ck-navegador");
    var colorHex = $("ckColorHex");
    var tonos = $("ckTonos").children;

    /* Un nombre de negocio sirve como dirección web si le sacamos los
       acentos, los espacios y todo lo que no sea letra o número. */
    function comoDominio(texto) {
      return texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    }

    /* ---------- Un color, cinco tonos ----------
       De un solo color salen todos los demás mezclándolo con blanco o con
       negro. Por eso la página se ve de una marca: no hay colores sueltos,
       son todos el mismo con más o menos luz. */
    function aRgb(hex) {
      var h = hex.replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
    }

    /* cuanto = 0 deja el color igual; 1 lo lleva del todo al destino */
    function mezclar(hex, destino, cuanto) {
      var c = aRgb(hex);
      return (
        "rgb(" +
        c
          .map(function (v, i) {
            return Math.round(v + (destino[i] - v) * cuanto);
          })
          .join(",") +
        ")"
      );
    }

    var BLANCO = [255, 255, 255];
    var NEGRO = [22, 18, 34];

    function pintarTonos(hex) {
      var escala = [
        mezclar(hex, BLANCO, 0.85),
        mezclar(hex, BLANCO, 0.55),
        hex,
        mezclar(hex, NEGRO, 0.28),
        mezclar(hex, NEGRO, 0.55),
      ];
      for (var i = 0; i < tonos.length && i < escala.length; i++) {
        tonos[i].style.background = escala[i];
      }
      navegador.style.setProperty("--tinta", hex);
      navegador.style.setProperty("--tinta-suave", escala[0]);
      navegador.style.setProperty("--tinta-fuerte", escala[3]);
      colorHex.textContent = hex.toUpperCase();
    }

    function pintarRedes() {
      var puestas = redesElegidas();
      vistaRedes.textContent = "";
      if (!puestas.length) return;
      puestas.forEach(function (nombre) {
        var punto = document.createElement("span");
        punto.className = "ckn-red";
        /* La inicial alcanza: es un boceto, no el logo de cada red */
        punto.textContent = nombre.charAt(0);
        punto.title = nombre;
        vistaRedes.appendChild(punto);
      });
    }

    function pintarVista() {
      var marca = negNombre.value.trim();
      var dominio = negDominio.value.trim();

      vistaMarca.textContent = marca || "Tu Negocio";

      if (dominio) {
        vistaUrl.textContent = dominio.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
      } else {
        var sugerida = comoDominio(marca);
        vistaUrl.textContent = sugerida ? sugerida + ".com" : "tunegocio.com";
      }
    }

    [negNombre, negDominio].forEach(function (campo) {
      campo.addEventListener("input", pintarVista);
    });

    negColor.addEventListener("input", function () {
      pintarTonos(negColor.value);
    });

    /* Los cuadraditos de abajo son un atajo: cargan el color en el mismo
       campo, así después lo puede seguir retocando a mano. */
    document.querySelectorAll(".js-tono").forEach(function (b) {
      b.addEventListener("click", function () {
        negColor.value = b.getAttribute("data-tono");
        pintarTonos(negColor.value);
      });
    });

    /* "Otro": abre el selector del sistema, con todos los colores.
       showPicker es lo correcto; donde no existe, tocar el campo hace lo
       mismo. */
    var otroColor = $("ckOtroColor");
    if (otroColor) {
      otroColor.addEventListener("click", function () {
        try {
          if (typeof negColor.showPicker === "function") negColor.showPicker();
          else negColor.click();
        } catch (err) {
          negColor.click();
        }
      });
    }

    document.querySelectorAll(".js-red").forEach(function (c) {
      c.addEventListener("change", pintarRedes);
    });

    pintarVista();
    pintarTonos(negColor.value);
    pintarRedes();

    /* Cuántas letras le quedan: el campo corta en 500 y sin el contador se
       nota recién cuando deja de escribir. */
    var cuenta = $("ckNegNotasCuenta");
    negNotas.addEventListener("input", function () {
      cuenta.textContent = String(negNotas.value.length);
    });
  }

  /* ---------- Espacio Publicitario: los datos del anuncio ----------
     Acá la vista previa no es un boceto: es la notificación de verdad, con
     el mismo dibujo que se ve en la portada. Lo que escribe es lo que sale. */
  var esPublicidad = packId === "publicidad";
  var pubNombre = $("ckPubNombre");
  var pubRubro = $("ckPubRubro");
  var pubFrase = $("ckPubFrase");
  var pubWsp = $("ckPubWsp");
  var pubWeb = $("ckPubWeb");
  var pubIg = $("ckPubIg");
  var pubTt = $("ckPubTt");
  var pubNotas = $("ckPubNotas");

  if (esPublicidad) {
    $("ckAnuncio").hidden = false;
    $("ckVistaPub").hidden = false;
    $("ckTitulo").textContent = "Publiquemos tu negocio";
    $("ckSub").textContent =
      "Completá tus datos, escribí tu anuncio y elegí cómo pagar. " +
      "Apenas entra el pago lo dejo publicado.";

    function pintarAnuncio() {
      var nombre = pubNombre.value.trim();
      var rubro = pubRubro.value.trim();
      var frase = pubFrase.value.trim();
      var wsp = pubWsp.value.trim();
      var web = pubWeb.value.trim();

      $("ckPubVistaNombre").textContent = nombre || "Tu Negocio";
      $("ckPubVistaRubro").textContent = rubro || "Tu rubro";
      $("ckPubVistaFrase").textContent = frase || "La frase que quieras, con lo que vendés.";
      $("ckPubVistaTel").textContent = wsp || "Tu teléfono";

      /* Las iniciales del nombre, como en la ficha de Cala Imports */
      var palabras = nombre.split(/\s+/).filter(Boolean);
      var iniciales = palabras.length
        ? (palabras[0].charAt(0) + (palabras[1] ? palabras[1].charAt(0) : "")).toUpperCase()
        : "TU";
      $("ckPubIni").textContent = iniciales;

      /* La pastillita repite el rubro, que es lo que hace que se entienda
         de un vistazo de qué es el anuncio */
      $("ckPubVistaBadge").textContent = rubro || "Tu oferta";

      /* Si no puso web, el botón fuerte manda al WhatsApp */
      $("ckPubVistaBtn").textContent = web ? "Ver catálogo" : "Escribinos";
    }

    [pubNombre, pubRubro, pubFrase, pubWsp, pubWeb].forEach(function (campo) {
      campo.addEventListener("input", pintarAnuncio);
    });

    var cuentaFrase = $("ckPubFraseCuenta");
    pubFrase.addEventListener("input", function () {
      cuentaFrase.textContent = String(pubFrase.value.length);
    });

    pintarAnuncio();
  }

  function fichaPublicidad() {
    if (!esPublicidad) return null;
    return {
      nombre: pubNombre.value.trim(),
      rubro: pubRubro.value.trim(),
      frase: pubFrase.value.trim(),
      wsp: pubWsp.value.trim(),
      web: pubWeb.value.trim(),
      instagram: pubIg.value.trim(),
      tiktok: pubTt.value.trim(),
      notas: pubNotas.value.trim(),
    };
  }

  /* Lo que escribió, listo para mandar. Devuelve null si no es este pack. */
  function fichaNegocio() {
    if (esPublicidad) return fichaPublicidad();
    if (!esNegocio) return null;
    var puestas = redesElegidas();
    return {
      nombre: negNombre.value.trim(),
      wsp: negWsp.value.trim(),
      dominio: negDominio.value.trim(),
      redes: puestas.length ? puestas.length + ": " + puestas.join(", ") : "ninguna por ahora",
      color: negColor.value.toUpperCase(),
      logo: negLogo.value,
      notas: negNotas.value.trim(),
    };
  }

  /* ---------- WhatsApp ---------- */
  var WSP_BASE = "https://wa.me/" + CONFIG.whatsappNumber + "?text=";
  document.querySelectorAll(".js-wsp").forEach(function (el) {
    el.setAttribute(
      "href",
      WSP_BASE +
        encodeURIComponent("Hola! Tengo una consulta sobre el " + pack.nombre + " de MayoristasYa.")
    );
  });

  /* ---------- Validación ---------- */
  var ckName = $("ckName");
  var ckEmail = $("ckEmail");
  var ckEmail2 = $("ckEmail2");
  var ckNameError = $("ckNameError");
  var ckEmailError = $("ckEmailError");
  var ckEmail2Error = $("ckEmail2Error");
  var ckEmailOk = $("ckEmailOk");

  var ES_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* Las mayúsculas y los espacios de más no hacen a dos correos distintos:
     "Ana@Gmail.com " y "ana@gmail.com" son la misma casilla. */
  function mismoEmail(a, b) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  function marcarError(input, span, mensaje) {
    span.textContent = mensaje;
    input.classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
  }

  function limpiarError(input, span) {
    span.textContent = "";
    input.classList.remove("has-error");
    input.removeAttribute("aria-invalid");
  }

  function validar(enfocar) {
    var name = ckName.value.trim();
    var email = ckEmail.value.trim();
    var email2 = ckEmail2.value.trim();
    var primerFallo = null;

    if (name.length < 3) {
      marcarError(ckName, ckNameError, "Ingresá tu nombre y apellido.");
      primerFallo = primerFallo || ckName;
    } else {
      limpiarError(ckName, ckNameError);
    }

    if (!ES_EMAIL.test(email)) {
      marcarError(ckEmail, ckEmailError, "Ingresá un correo válido, ahí te mandamos el pack.");
      primerFallo = primerFallo || ckEmail;
    } else {
      limpiarError(ckEmail, ckEmailError);
    }

    if (!email2) {
      marcarError(ckEmail2, ckEmail2Error, "Escribí tu correo otra vez para confirmarlo.");
      primerFallo = primerFallo || ckEmail2;
    } else if (!mismoEmail(email, email2)) {
      marcarError(ckEmail2, ckEmail2Error, "Los dos correos no coinciden. Revisalos.");
      primerFallo = primerFallo || ckEmail2;
    } else {
      limpiarError(ckEmail2, ckEmail2Error);
    }

    /* Los tres de la ficha de armado. Sin el nombre del negocio, el rubro y
       un WhatsApp no se puede empezar la página, así que son obligatorios
       igual que el correo. El resto puede quedar vacío. */
    if (esNegocio) {
      if (negNombre.value.trim().length < 2) {
        marcarError(negNombre, $("ckNegNombreError"), "Poné el nombre que va a llevar tu página.");
        primerFallo = primerFallo || negNombre;
      } else {
        limpiarError(negNombre, $("ckNegNombreError"));
      }

      /* Ocho dígitos es lo mínimo de un número argentino sin el 0 ni el 15 */
      if (negWsp.value.replace(/\D/g, "").length < 8) {
        marcarError(negWsp, $("ckNegWspError"), "Escribí el WhatsApp de tu negocio, con característica.");
        primerFallo = primerFallo || negWsp;
      } else {
        limpiarError(negWsp, $("ckNegWspError"));
      }
    }

    /* El anuncio no se puede publicar sin el nombre, el rubro, la frase y un
       WhatsApp: son las cuatro cosas que salen en la notificación. */
    if (esPublicidad) {
      [
        [pubNombre, "ckPubNombreError", 2, "Poné el nombre de tu negocio."],
        [pubRubro, "ckPubRubroError", 3, "Decinos tu rubro: es lo que se lee arriba."],
        [pubFrase, "ckPubFraseError", 10, "Escribí una frase corta de qué vendés."],
      ].forEach(function (c) {
        if (c[0].value.trim().length < c[2]) {
          marcarError(c[0], $(c[1]), c[3]);
          primerFallo = primerFallo || c[0];
        } else {
          limpiarError(c[0], $(c[1]));
        }
      });

      if (pubWsp.value.replace(/\D/g, "").length < 8) {
        marcarError(pubWsp, $("ckPubWspError"), "Escribí tu WhatsApp, con característica.");
        primerFallo = primerFallo || pubWsp;
      } else {
        limpiarError(pubWsp, $("ckPubWspError"));
      }
    }

    if (primerFallo) {
      if (enfocar) {
        primerFallo.focus();
        /* Si el que falla es un campo de la ficha, puede estar bastante más
           abajo que el botón: lo llevamos a la vista además de enfocarlo. */
        primerFallo.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return null;
    }
    return { name: name, email: email, ficha: fichaNegocio() };
  }

  /* Limpia el error apenas el visitante corrige, sin esperar a que reenvíe. */
  var pares = [[ckName, ckNameError], [ckEmail, ckEmailError], [ckEmail2, ckEmail2Error]];
  if (esNegocio) {
    pares.push([negNombre, $("ckNegNombreError")]);
    pares.push([negWsp, $("ckNegWspError")]);
  }
  if (esPublicidad) {
    pares.push([pubNombre, $("ckPubNombreError")]);
    pares.push([pubRubro, $("ckPubRubroError")]);
    pares.push([pubFrase, $("ckPubFraseError")]);
    pares.push([pubWsp, $("ckPubWspError")]);
  }
  pares.forEach(function (par) {
    par[0].addEventListener("input", function () {
      if (par[1].textContent) limpiarError(par[0], par[1]);
    });
  });

  /* El tilde verde aparece solo cuando los dos correos están completos e
     iguales. Es la confirmación que hace que valga la pena escribirlo dos
     veces: se ve el resultado antes de pagar, no después. */
  function revisarCoincidencia() {
    var email = ckEmail.value.trim();
    var email2 = ckEmail2.value.trim();
    ckEmailOk.hidden = !(ES_EMAIL.test(email) && email2 && mismoEmail(email, email2));
  }

  [ckEmail, ckEmail2].forEach(function (campo) {
    campo.addEventListener("input", revisarCoincidencia);
    campo.addEventListener("blur", revisarCoincidencia);
  });

  /* Si ya escribió los dos y no coinciden, avisamos al salir del campo y no
     al tocar "Pagar": es más fácil corregir mientras todavía está ahí. */
  ckEmail2.addEventListener("blur", function () {
    var email = ckEmail.value.trim();
    var email2 = ckEmail2.value.trim();
    if (email && email2 && !mismoEmail(email, email2)) {
      marcarError(ckEmail2, ckEmail2Error, "Los dos correos no coinciden. Revisalos.");
    }
  });

  /* ---------- Botón: pagar online ---------- */
  var btnPagarMP = $("btnPagarMP");

  /* ---------- Ayuda por WhatsApp cuando el pago se complica ----------
     El link se arma con el pack y, si ya los cargó, con el nombre y el correo:
     así el mensaje llega con todo lo necesario para encontrar el pedido y no
     hay que pedirle los datos de nuevo a alguien que ya tuvo un problema. */
  function linkProblema() {
    var l = [];
    l.push("Hola! Tuve un problema para pagar el " + pack.nombre + " en la web.");
    l.push("");

    var nombre = ckName.value.trim();
    var email = ckEmail.value.trim();
    if (nombre) l.push("Nombre: " + nombre);
    if (email) l.push("Correo: " + email);

    l.push("¿Me ayudan a completar la compra?");
    return WSP_BASE + encodeURIComponent(l.join("\n"));
  }

  var ckProblemaWsp = $("ckProblemaWsp");
  var ckAlertaPago = $("ckAlertaPago");
  var ckAlertaWsp = $("ckAlertaWsp");

  /* Se recalcula al momento de tocarlo, para tomar lo último que escribió */
  [ckProblemaWsp, ckAlertaWsp].forEach(function (el) {
    if (!el) return;
    el.setAttribute("href", linkProblema());
    el.addEventListener("click", function () {
      el.setAttribute("href", linkProblema());
    });
  });

  if (btnPagarMP && window.mwPagoConfigurado) {
    btnPagarMP.hidden = false;
    $("checkoutMedios").hidden = false;
    $("checkoutSep").hidden = false;
    $("checkoutNote").textContent = "El pack te llega por correo apenas se acredita el pago.";

    var textoOriginal = btnPagarMP.innerHTML;
    var vigilante = null;

    /* Deja el botón como estaba. Se usa en dos casos: cuando el pago no
       arranca, y cuando el comprador vuelve con el botón "atrás" del
       navegador (si no, se encontraba el botón muerto en "Abriendo..."). */
    function restaurarBoton() {
      if (vigilante) {
        window.clearTimeout(vigilante);
        vigilante = null;
      }
      btnPagarMP.disabled = false;
      btnPagarMP.innerHTML = textoOriginal;
    }

    window.addEventListener("pageshow", function (e) {
      if (e.persisted || btnPagarMP.disabled) restaurarBoton();
    });

    btnPagarMP.addEventListener("click", function () {
      var datos = validar(true);
      if (!datos) return;

      if (window.mwTrack) {
        window.mwTrack("add_payment_info", {
          currency: "ARS",
          value: pack.precio,
          payment_type: "mercadopago",
          items: [{ item_id: packId, item_name: pack.nombre, price: pack.precio, quantity: 1 }],
        });
      }

      /* Se lo mostramos después en gracias.html, para que sepa a qué casilla
         mirar. Es la misma pestaña, así que el dato sigue estando cuando
         vuelve de Mercado Pago. */
      try {
        window.sessionStorage.setItem("mwCorreoCompra", datos.email);
      } catch (err) {
        /* modo privado: seguimos igual */
      }

      if (ckAlertaPago) ckAlertaPago.hidden = true;
      btnPagarMP.disabled = true;
      btnPagarMP.textContent = "Abriendo el pago seguro...";

      /* pagos.js intenta por 9 segundos y después navega igual. Si a los 15
         seguimos acá, no salió ni el plan B: le devolvemos el botón y le
         ofrecemos WhatsApp en vez de dejarlo mirando una pantalla trabada. */
      vigilante = window.setTimeout(function () {
        restaurarBoton();
        if (!ckAlertaPago) return;
        if (ckAlertaWsp) ckAlertaWsp.setAttribute("href", linkProblema());
        ckAlertaPago.hidden = false;
        ckAlertaPago.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 15000);

      window.mwPagarConMercadoPago({
        packId: packId,
        nombre: datos.name,
        email: datos.email,
        ficha: datos.ficha,
      });
    });
  }

  /* ---------- Botón: coordinar por WhatsApp ---------- */
  $("ckForm").addEventListener("submit", function (e) {
    e.preventDefault();

    var datos = validar(true);
    if (!datos) return;

    var l = [];
    l.push("Hola, quiero confirmar mi compra en " + CONFIG.businessName + ".");
    l.push("");
    l.push("Pedido: " + pack.nombre);
    l.push("Total: " + formatPrice(pack.precio));
    if (pack.mensual) l.push("(Incluye además $60.000 por mes de mantenimiento de la página.)");
    l.push("");
    l.push("Datos de contacto:");
    l.push("Nombre: " + datos.name);
    l.push("Email: " + datos.email);

    /* La ficha va también por acá: el que paga por transferencia manda el
       mensaje y ya llega con todo para empezar a armarle la página. */
    if (datos.ficha) {
      l.push("");
      l.push(esPublicidad ? "Los datos de mi anuncio:" : "Para armar mi página:");
      l.push("Negocio: " + datos.ficha.nombre);
      if (datos.ficha.rubro) l.push("Rubro: " + datos.ficha.rubro);
      if (datos.ficha.frase) l.push("Frase: " + datos.ficha.frase);
      l.push("WhatsApp: " + datos.ficha.wsp);
      if (datos.ficha.web) l.push("Web: " + datos.ficha.web);
      if (datos.ficha.instagram) l.push("Instagram: " + datos.ficha.instagram);
      if (datos.ficha.tiktok) l.push("TikTok: " + datos.ficha.tiktok);
      if (datos.ficha.dominio) l.push("Dominio que quiero: " + datos.ficha.dominio);
      if (datos.ficha.redes) l.push("Redes que quiero: " + datos.ficha.redes);
      if (datos.ficha.color) l.push("Color: " + datos.ficha.color);
      if (datos.ficha.logo) l.push("Logo: " + datos.ficha.logo);
      if (datos.ficha.notas) l.push("Nota: " + datos.ficha.notas);
    }

    l.push("");
    l.push("Voy a realizar la transferencia a la siguiente cuenta:");
    l.push("Alias: " + CONFIG.transfer.alias);
    l.push("CBU: " + CONFIG.transfer.cbu);
    l.push("Titular: " + CONFIG.transfer.titular);

    var url = WSP_BASE + encodeURIComponent(l.join("\n"));

    if (window.mwTrack) {
      window.mwTrack("generate_lead", {
        currency: "ARS",
        value: pack.precio,
        items: [{ item_id: packId, item_name: pack.nombre, price: pack.precio, quantity: 1 }],
      });
    }

    if (window.mwSendOrder) {
      window.mwSendOrder({
        name: datos.name,
        email: datos.email,
        items: pack.nombre,
        total: pack.precio,
        ficha: datos.ficha,
      });
    }

    window.location.href = url;
  });

  /* ---------- La vista previa, cerca de donde se escribe ----------
     En computadora el resumen va a la derecha y la vista previa se ve al
     lado del formulario. En celular el resumen va ARRIBA de todo (primero
     ves qué comprás y cuánto), y entonces la vista previa quedaba a unos
     900px de los campos: se armaba sola y nadie la veía.

     Así que en pantalla chica la bajamos, justo debajo de los campos. Si se
     gira el teléfono o se agranda la ventana, vuelve a su lugar. */
  var laVista = esNegocio ? $("ckVista") : esPublicidad ? $("ckVistaPub") : null;
  var losCampos = esNegocio ? $("ckArmado") : esPublicidad ? $("ckAnuncio") : null;

  if (laVista && losCampos && window.matchMedia) {
    var suLugar = laVista.parentNode;
    var elMarcador = document.createComment("vista previa");
    suLugar.insertBefore(elMarcador, laVista);

    var angosto = window.matchMedia("(max-width: 859px)");

    function acomodarVista(consulta) {
      if (consulta.matches) {
        if (laVista.parentNode !== losCampos.parentNode) {
          losCampos.parentNode.insertBefore(laVista, losCampos.nextSibling);
        }
      } else if (laVista.parentNode !== suLugar) {
        suLugar.insertBefore(laVista, elMarcador);
      }
    }

    acomodarVista(angosto);

    /* addListener es lo viejo, pero algunos Safari todavía no tienen el
       addEventListener de matchMedia */
    if (angosto.addEventListener) angosto.addEventListener("change", acomodarVista);
    else if (angosto.addListener) angosto.addListener(acomodarVista);
  }

  /* ---------- Año del footer ---------- */
  var y = $("year");
  if (y) y.textContent = new Date().getFullYear();
})();
