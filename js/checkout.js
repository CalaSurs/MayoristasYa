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
    "negocio-mayorista": {
      nombre: "Negocio Mayorista",
      desc: "Tu propia página, con los 3 packs incluidos",
      precio: 79999,
      antes: 159999,
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
  var ckNameError = $("ckNameError");
  var ckEmailError = $("ckEmailError");

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
    var primerFallo = null;

    if (name.length < 3) {
      marcarError(ckName, ckNameError, "Ingresá tu nombre y apellido.");
      primerFallo = primerFallo || ckName;
    } else {
      limpiarError(ckName, ckNameError);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      marcarError(ckEmail, ckEmailError, "Ingresá un correo válido, ahí te mandamos el pack.");
      primerFallo = primerFallo || ckEmail;
    } else {
      limpiarError(ckEmail, ckEmailError);
    }

    if (primerFallo) {
      if (enfocar) primerFallo.focus();
      return null;
    }
    return { name: name, email: email };
  }

  /* Limpia el error apenas el visitante corrige, sin esperar a que reenvíe. */
  [[ckName, ckNameError], [ckEmail, ckEmailError]].forEach(function (par) {
    par[0].addEventListener("input", function () {
      if (par[1].textContent) limpiarError(par[0], par[1]);
    });
  });

  /* ---------- Botón: pagar online ---------- */
  var btnPagarMP = $("btnPagarMP");

  if (btnPagarMP && window.mwPagoConfigurado) {
    btnPagarMP.hidden = false;
    $("checkoutMedios").hidden = false;
    $("checkoutSep").hidden = false;
    $("checkoutNote").textContent = "El pack te llega por correo apenas se acredita el pago.";

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

      btnPagarMP.disabled = true;
      btnPagarMP.textContent = "Abriendo el pago seguro...";

      window.mwPagarConMercadoPago({
        packId: packId,
        nombre: datos.name,
        email: datos.email,
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
    if (pack.mensual) l.push("(Incluye además $30.000 por mes de mantenimiento de la página.)");
    l.push("");
    l.push("Datos de contacto:");
    l.push("Nombre: " + datos.name);
    l.push("Email: " + datos.email);
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
      });
    }

    window.location.href = url;
  });

  /* ---------- Año del footer ---------- */
  var y = $("year");
  if (y) y.textContent = new Date().getFullYear();
})();
