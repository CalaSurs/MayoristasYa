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
  var topFixed = document.getElementById("topFixed");

  function onScroll() {
    if (topFixed) topFixed.classList.toggle("is-scrolled", window.scrollY > 12);
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

  /* ---------- Compra directa (sin carrito) ---------- */
  var selectedItem = null;

  function formatPrice(n) {
    return "$" + n.toLocaleString("es-AR");
  }

  function itemsForTracking() {
    if (!selectedItem) return [];
    return [{ item_id: selectedItem.id, item_name: selectedItem.name, price: selectedItem.price, quantity: 1 }];
  }

  var checkoutModal = document.getElementById("checkoutModal");
  var checkoutBackdrop = document.getElementById("checkoutBackdrop");
  var checkoutClose = document.getElementById("checkoutClose");
  var checkoutStepView = document.getElementById("checkoutStepView");
  var checkoutSuccessView = document.getElementById("checkoutSuccessView");

  function openCheckout(item) {
    if (!checkoutModal) return;
    selectedItem = item;
    renderCheckoutSummary();

    if (checkoutStepView) checkoutStepView.hidden = false;
    if (checkoutSuccessView) checkoutSuccessView.hidden = true;

    checkoutModal.classList.add("is-open");
    if (checkoutBackdrop) checkoutBackdrop.classList.add("is-open");
    checkoutModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("checkout-open");

    window.setTimeout(function () {
      var ckNameEl = document.getElementById("ckName");
      if (ckNameEl) ckNameEl.focus();
    }, 300);

    if (window.mwTrack) {
      window.mwTrack("begin_checkout", {
        currency: "ARS",
        value: item.price,
        items: itemsForTracking(),
      });
    }
  }

  function closeCheckout() {
    if (!checkoutModal) return;
    checkoutModal.classList.remove("is-open");
    if (checkoutBackdrop) checkoutBackdrop.classList.remove("is-open");
    checkoutModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("checkout-open");
  }

  if (checkoutClose) checkoutClose.addEventListener("click", closeCheckout);
  if (checkoutBackdrop) checkoutBackdrop.addEventListener("click", closeCheckout);

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

  /* ---------- Botones de compra: van directo al checkout ---------- */
  document.querySelectorAll(".js-buy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openCheckout({
        id: btn.getAttribute("data-id"),
        name: btn.getAttribute("data-name"),
        price: parseInt(btn.getAttribute("data-price"), 10),
        priceLabel: btn.getAttribute("data-price-label"),
      });
    });
  });

  /* ---------- Checkout ---------- */
  var checkoutSummary = document.getElementById("checkoutSummary");
  var checkoutWspLink = document.getElementById("checkoutWspLink");
  var checkoutForm = document.getElementById("checkoutForm");
  var ckName = document.getElementById("ckName");
  var ckEmail = document.getElementById("ckEmail");
  var ckNameError = document.getElementById("ckNameError");
  var ckEmailError = document.getElementById("ckEmailError");

  function renderCheckoutSummary() {
    if (!checkoutSummary || !selectedItem) return;
    var html =
      '<div class="cs-row"><span>' + selectedItem.name + "</span><span>" + formatPrice(selectedItem.price) + "</span></div>";
    if (selectedItem.id === "negocio-mayorista") {
      html += '<div class="cs-note">+ $30.000 por mes de mantenimiento de la página</div>';
    }
    html += '<div class="cs-total"><span>Total</span><span>' + formatPrice(selectedItem.price) + "</span></div>";
    checkoutSummary.innerHTML = html;
  }

  function buildOrderMessage(name, email) {
    var lines = [];
    lines.push("Hola, quiero confirmar mi compra en " + CONFIG.businessName + ".");
    lines.push("");
    lines.push("Pedido: " + selectedItem.name);
    lines.push("Total: " + formatPrice(selectedItem.price));
    if (selectedItem.id === "negocio-mayorista") {
      lines.push("(Incluye además $30.000 por mes de mantenimiento de la página.)");
    }
    lines.push("");
    lines.push("Datos de contacto:");
    lines.push("Nombre: " + name);
    lines.push("Email: " + email);
    lines.push("");
    lines.push("Voy a realizar la transferencia a la siguiente cuenta:");
    lines.push("Alias: " + CONFIG.transfer.alias);
    lines.push("CBU: " + CONFIG.transfer.cbu);
    lines.push("Titular: " + CONFIG.transfer.titular);
    lines.push("");
    lines.push(
      "Entiendo que dentro de las próximas 48 horas voy a recibir por este mismo chat la lista completa de los proveedores correspondientes a mi pack. Muchas gracias."
    );
    return lines.join("\n");
  }

  /* Valida los dos campos y devuelve {name, email} o null si algo está mal.
     La usan tanto el botón de Mercado Pago como el de WhatsApp. */
  function validarDatos() {
    var name = ckName.value.trim();
    var email = ckEmail.value.trim();
    var valid = true;

    if (name.length < 3) {
      if (ckNameError) ckNameError.textContent = "Ingresá tu nombre completo.";
      ckName.classList.add("has-error");
      valid = false;
    } else {
      if (ckNameError) ckNameError.textContent = "";
      ckName.classList.remove("has-error");
    }

    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      if (ckEmailError) ckEmailError.textContent = "Ingresá un email válido.";
      ckEmail.classList.add("has-error");
      valid = false;
    } else {
      if (ckEmailError) ckEmailError.textContent = "";
      ckEmail.classList.remove("has-error");
    }

    return valid ? { name: name, email: email } : null;
  }

  /* ---------- Botón: pagar con Mercado Pago ---------- */
  var btnPagarMP = document.getElementById("btnPagarMP");
  var checkoutSep = document.getElementById("checkoutSep");
  var checkoutNote = document.getElementById("checkoutNote");

  /* El botón solo aparece si ya pegaste la URL del script en js/pagos.js. */
  if (btnPagarMP && window.mwPagoConfigurado) {
    btnPagarMP.hidden = false;
    if (checkoutSep) checkoutSep.hidden = false;
    if (checkoutNote) {
      checkoutNote.textContent =
        "Pagás con tarjeta, dinero en cuenta o transferencia. El pack te llega por mail apenas se acredita.";
    }

    btnPagarMP.addEventListener("click", function () {
      var datos = validarDatos();
      if (!datos || !selectedItem) return;

      if (window.mwTrack) {
        window.mwTrack("add_payment_info", {
          currency: "ARS",
          value: selectedItem.price,
          payment_type: "mercadopago",
          items: itemsForTracking(),
        });
      }

      btnPagarMP.disabled = true;
      btnPagarMP.textContent = "Llevándote a Mercado Pago...";

      /* Esto navega la página entera al Apps Script, que redirige a
         Mercado Pago. No hace falta mostrar la pantalla de éxito. */
      window.mwPagarConMercadoPago({
        packId: selectedItem.id,
        nombre: datos.name,
        email: datos.email,
      });
    });
  }

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var datos = validarDatos();
      if (!datos) return;

      var name = datos.name;
      var email = datos.email;

      var message = buildOrderMessage(name, email);
      var url = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(message);

      if (checkoutWspLink) checkoutWspLink.setAttribute("href", url);
      if (checkoutStepView) checkoutStepView.hidden = true;
      if (checkoutSuccessView) checkoutSuccessView.hidden = false;

      window.open(url, "_blank", "noopener");

      if (window.mwTrack) {
        window.mwTrack("generate_lead", {
          currency: "ARS",
          value: selectedItem.price,
          items: itemsForTracking(),
        });
      }

      if (window.mwSendOrder) {
        window.mwSendOrder({
          name: name,
          email: email,
          items: selectedItem.name,
          total: selectedItem.price,
        });
      }

    });
  }

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
      closeCheckout();
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

  /* ---------- Contadores animados ---------- */
  var counters = document.querySelectorAll(".stat-num[data-count]");

  function animateCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var decimals = parseInt(el.getAttribute("data-decimals"), 10) || 0;
    var duration = 1400;
    var start = null;

    function step(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = eased * target;
      var display = decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toLocaleString("es-AR");
      el.textContent = display + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        var finalDisplay = decimals > 0 ? target.toFixed(decimals) : target.toLocaleString("es-AR");
        el.textContent = finalDisplay + suffix;
      }
    }
    window.requestAnimationFrame(step);
  }

  if (counters.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      counters.forEach(function (el) {
        var target = parseFloat(el.getAttribute("data-count"));
        var decimals = parseInt(el.getAttribute("data-decimals"), 10) || 0;
        var display = decimals > 0 ? target.toFixed(decimals) : target.toLocaleString("es-AR");
        el.textContent = display + (el.getAttribute("data-suffix") || "");
      });
    } else {
      var counterObserver = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach(function (el) {
        counterObserver.observe(el);
      });
    }
  }

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
