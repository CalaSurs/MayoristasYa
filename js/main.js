(function () {
  "use strict";

  /* ---------- Configuración editable ---------- */
  var CONFIG = {
    businessName: "MayoristasYa",
    whatsappNumber: "5491128520849",
    whatsappDefaultMessage: "Hola, quiero comprar el Pack de +1000 Proveedores de MayoristasYa.",
    transfer: {
      alias: "lautaro.calabria",
      cbu: "0000003100009573267564",
      titular: "Lautaro Lopez Calabria",
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

  /* ---------- Toasts ---------- */
  var toastStack = document.getElementById("toastStack");

  function showToast(message) {
    if (!toastStack) return;
    var toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML =
      '<span class="toast-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></span>' +
      "<p>" + message + "</p>";
    toastStack.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });
    window.setTimeout(function () {
      toast.classList.remove("is-visible");
      window.setTimeout(function () {
        toast.remove();
      }, 350);
    }, 3200);
  }

  /* ---------- Carrito de compras ---------- */
  var CART_KEY = "mayoristasya_cart";
  var cart = {};

  function loadCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      if (raw) cart = JSON.parse(raw) || {};
    } catch (e) {
      cart = {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      /* localStorage no disponible: el carrito sigue funcionando en memoria */
    }
  }

  function cartIds() {
    return Object.keys(cart);
  }

  function cartCount() {
    var n = 0;
    cartIds().forEach(function (id) {
      n += cart[id].qty;
    });
    return n;
  }

  function cartTotal() {
    var t = 0;
    cartIds().forEach(function (id) {
      t += cart[id].qty * cart[id].price;
    });
    return t;
  }

  function formatPrice(n) {
    return "$" + n.toLocaleString("es-AR");
  }

  function cartItemsForTracking() {
    return cartIds().map(function (id) {
      var item = cart[id];
      return { item_id: item.id, item_name: item.name, price: item.price, quantity: item.qty };
    });
  }

  var cartBadge = document.getElementById("cartBadge");
  var cartToggle = document.getElementById("cartToggle");
  var cartModal = document.getElementById("cartModal");
  var cartBackdrop = document.getElementById("cartBackdrop");
  var cartClose = document.getElementById("cartClose");
  var cartList = document.getElementById("cartList");
  var cartTotalRow = document.getElementById("cartTotalRow");
  var cartTotalEl = document.getElementById("cartTotal");
  var cartConfirmBtn = document.getElementById("cartConfirmBtn");
  var cartStepView = document.getElementById("cartStepView");
  var checkoutStepView = document.getElementById("checkoutStepView");
  var checkoutBack = document.getElementById("checkoutBack");
  var checkoutSuccessView = document.getElementById("checkoutSuccessView");

  function renderCart() {
    var ids = cartIds();
    var count = cartCount();

    if (cartBadge) {
      cartBadge.textContent = String(count);
      cartBadge.classList.toggle("is-visible", count > 0);
    }

    if (cartList) {
      if (ids.length === 0) {
        cartList.innerHTML =
          '<div class="cart-empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 3h2l2.2 12.2a2 2 0 0 0 2 1.65h7.7a2 2 0 0 0 1.98-1.7L20 8H6.1"/></svg>' +
          "<p>Tu carrito está vacío</p>" +
          "</div>";
        if (cartTotalRow) cartTotalRow.hidden = true;
        if (cartConfirmBtn) cartConfirmBtn.hidden = true;
      } else {
        var html = "";
        ids.forEach(function (id) {
          var item = cart[id];
          html +=
            '<div class="cart-item" data-id="' + item.id + '">' +
            '<div class="cart-item-info">' +
            "<strong>" + item.name + "</strong>" +
            "<span>" + item.priceLabel + " c/u</span>" +
            "</div>" +
            '<div class="cart-item-right">' +
            '<div class="qty-stepper">' +
            '<button type="button" class="qty-btn" data-action="dec" aria-label="Restar unidad de ' + item.name + '">−</button>' +
            '<span class="qty-val">' + item.qty + "</span>" +
            '<button type="button" class="qty-btn" data-action="inc" aria-label="Sumar unidad de ' + item.name + '">+</button>' +
            "</div>" +
            '<span class="cart-item-total">' + formatPrice(item.qty * item.price) + "</span>" +
            '<button type="button" class="cart-item-remove" data-action="remove" aria-label="Quitar ' + item.name + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7"/></svg></button>' +
            "</div>" +
            "</div>";
        });
        cartList.innerHTML = html;
        if (cartTotalRow) cartTotalRow.hidden = false;
        if (cartConfirmBtn) cartConfirmBtn.hidden = false;
        if (cartTotalEl) cartTotalEl.textContent = formatPrice(cartTotal());
      }
    }
  }

  function bumpBadge() {
    if (!cartBadge) return;
    cartBadge.classList.remove("bump");
    void cartBadge.offsetWidth;
    cartBadge.classList.add("bump");
  }

  function showCartStep() {
    if (cartStepView) cartStepView.hidden = false;
    if (checkoutStepView) checkoutStepView.hidden = true;
    if (checkoutSuccessView) checkoutSuccessView.hidden = true;
  }

  function openCart() {
    if (!cartModal) return;
    showCartStep();
    renderCart();
    cartModal.classList.add("is-open");
    if (cartBackdrop) cartBackdrop.classList.add("is-open");
    cartModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-open");
  }

  function closeCart() {
    if (!cartModal) return;
    cartModal.classList.remove("is-open");
    if (cartBackdrop) cartBackdrop.classList.remove("is-open");
    cartModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cart-open");
  }

  if (cartToggle) {
    cartToggle.addEventListener("click", function () {
      if (cartModal && cartModal.classList.contains("is-open")) {
        closeCart();
      } else {
        openCart();
      }
    });
  }
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

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

  if (cartList) {
    cartList.addEventListener("click", function (e) {
      var itemEl = e.target.closest(".cart-item");
      if (!itemEl) return;
      var id = itemEl.getAttribute("data-id");
      if (!cart[id]) return;

      var qtyBtn = e.target.closest(".qty-btn");
      var removeBtn = e.target.closest(".cart-item-remove");

      if (qtyBtn) {
        var action = qtyBtn.getAttribute("data-action");
        if (action === "inc") {
          cart[id].qty += 1;
        } else {
          cart[id].qty -= 1;
          if (cart[id].qty <= 0) delete cart[id];
        }
        saveCart();
        renderCart();
      } else if (removeBtn) {
        delete cart[id];
        saveCart();
        renderCart();
      }
    });
  }

  document.querySelectorAll(".js-add-cart").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-id");
      var name = btn.getAttribute("data-name");
      var price = parseInt(btn.getAttribute("data-price"), 10);
      var priceLabel = btn.getAttribute("data-price-label");

      if (cart[id]) {
        cart[id].qty += 1;
      } else {
        cart[id] = { id: id, name: name, price: price, priceLabel: priceLabel, qty: 1 };
      }
      saveCart();
      renderCart();
      bumpBadge();
      showToast(name + " agregado — Tocá el carrito para finalizar");

      if (window.mwTrack) {
        window.mwTrack("add_to_cart", {
          currency: "ARS",
          value: price,
          items: [{ item_id: id, item_name: name, price: price, quantity: 1 }],
        });
      }

      var originalHTML = btn.innerHTML;
      btn.classList.add("is-added");
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg> Agregado';
      window.setTimeout(function () {
        btn.innerHTML = originalHTML;
        btn.classList.remove("is-added");
      }, 1400);
    });
  });

  /* ---------- Checkout (paso 2) ---------- */
  var checkoutSummary = document.getElementById("checkoutSummary");
  var checkoutWspLink = document.getElementById("checkoutWspLink");
  var checkoutForm = document.getElementById("checkoutForm");
  var ckName = document.getElementById("ckName");
  var ckEmail = document.getElementById("ckEmail");
  var ckNameError = document.getElementById("ckNameError");
  var ckEmailError = document.getElementById("ckEmailError");

  function renderCheckoutSummary() {
    if (!checkoutSummary) return;
    var html = "";
    cartIds().forEach(function (id) {
      var item = cart[id];
      html +=
        '<div class="cs-row"><span>' + item.name + " x" + item.qty + "</span><span>" + formatPrice(item.qty * item.price) + "</span></div>";
    });
    html += '<div class="cs-total"><span>Total</span><span>' + formatPrice(cartTotal()) + "</span></div>";
    checkoutSummary.innerHTML = html;
  }

  function showCheckoutStep() {
    if (!cartModal || cartIds().length === 0) return;
    if (cartStepView) cartStepView.hidden = true;
    if (checkoutStepView) checkoutStepView.hidden = false;
    if (checkoutSuccessView) checkoutSuccessView.hidden = true;
    renderCheckoutSummary();
    window.setTimeout(function () {
      if (ckName) ckName.focus();
    }, 300);

    if (window.mwTrack) {
      window.mwTrack("begin_checkout", {
        currency: "ARS",
        value: cartTotal(),
        items: cartItemsForTracking(),
      });
    }
  }

  if (cartConfirmBtn) cartConfirmBtn.addEventListener("click", showCheckoutStep);
  if (checkoutBack) checkoutBack.addEventListener("click", showCartStep);

  function buildOrderMessage(name, email) {
    var lines = [];
    lines.push("Hola, quiero confirmar mi compra en " + CONFIG.businessName + ".");
    lines.push("");
    lines.push("Pedido:");
    cartIds().forEach(function (id) {
      var item = cart[id];
      lines.push("- " + item.name + " (x" + item.qty + "): " + formatPrice(item.qty * item.price));
    });
    lines.push("Total: " + formatPrice(cartTotal()));
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

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", function (e) {
      e.preventDefault();
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

      if (!valid) return;

      var message = buildOrderMessage(name, email);
      var url = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(message);

      if (checkoutWspLink) checkoutWspLink.setAttribute("href", url);
      if (checkoutStepView) checkoutStepView.hidden = true;
      if (checkoutSuccessView) checkoutSuccessView.hidden = false;

      window.open(url, "_blank", "noopener");

      if (window.mwTrack) {
        window.mwTrack("generate_lead", {
          currency: "ARS",
          value: cartTotal(),
          items: cartItemsForTracking(),
        });
      }

      if (window.mwSendOrder) {
        var itemsSummary = cartItemsForTracking()
          .map(function (item) {
            return item.item_name + " x" + item.quantity;
          })
          .join(", ");

        window.mwSendOrder({
          name: name,
          email: email,
          items: itemsSummary,
          total: cartTotal(),
        });
      }

      cart = {};
      saveCart();
      renderCart();
    });
  }

  loadCart();
  renderCart();

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
      closeCart();
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
