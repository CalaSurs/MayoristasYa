(function () {
  "use strict";

  /* ---------- WhatsApp CTA links ---------- */
  var WSP_NUMBER = "5491128520849";
  var WSP_MESSAGE = "Hola, quiero comprar el Pack de +1000 Proveedores de MayoristasYa.";
  var WSP_URL = "https://wa.me/" + WSP_NUMBER + "?text=" + encodeURIComponent(WSP_MESSAGE);

  document.querySelectorAll(".js-wsp").forEach(function (el) {
    el.setAttribute("href", WSP_URL);
  });

  /* ---------- Header + barra de oferta: estado de scroll ---------- */
  var topFixed = document.getElementById("topFixed");
  if (topFixed) {
    var onScroll = function () {
      if (window.scrollY > 12) {
        topFixed.classList.add("is-scrolled");
      } else {
        topFixed.classList.remove("is-scrolled");
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Barra de compra fija (mobile) ---------- */
  var buyBar = document.getElementById("mobileBuyBar");
  var heroEl = document.getElementById("hero");
  if (buyBar && heroEl) {
    if ("IntersectionObserver" in window) {
      var buyBarObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            buyBar.classList.toggle("is-visible", !entry.isIntersecting);
          });
        },
        { rootMargin: "-60% 0px 0px 0px" }
      );
      buyBarObserver.observe(heroEl);
    }
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

  var cartBadge = document.getElementById("cartBadge");
  var cartToggle = document.getElementById("cartToggle");
  var cartDrawer = document.getElementById("cartDrawer");
  var cartBackdrop = document.getElementById("cartBackdrop");
  var cartClose = document.getElementById("cartClose");
  var cartBody = document.getElementById("cartBody");
  var cartFoot = document.getElementById("cartFoot");
  var cartTotalEl = document.getElementById("cartTotal");
  var cartCheckoutBtn = document.getElementById("cartCheckoutBtn");
  var mbbLabel = document.getElementById("mbbLabel");
  var mbbValue = document.getElementById("mbbValue");
  var mbbAction = document.getElementById("mbbAction");

  function updateMobileBuyBar() {
    if (!mbbLabel || !mbbValue || !mbbAction) return;
    var count = cartCount();
    if (count > 0) {
      mbbLabel.textContent = count + (count === 1 ? " pack en el carrito" : " packs en el carrito");
      mbbValue.textContent = formatPrice(cartTotal());
      mbbAction.textContent = "Ver Carrito";
      mbbAction.onclick = openCart;
    } else {
      mbbLabel.textContent = "Packs desde";
      mbbValue.textContent = "$4.999";
      mbbAction.textContent = "Ver Packs";
      mbbAction.onclick = function () {
        var target = document.getElementById("precios");
        if (target) target.scrollIntoView({ behavior: "smooth" });
      };
    }
  }

  function renderCart() {
    var ids = cartIds();
    var count = cartCount();

    if (cartBadge) {
      cartBadge.textContent = String(count);
      cartBadge.classList.toggle("is-visible", count > 0);
    }

    if (cartBody) {
      if (ids.length === 0) {
        cartBody.innerHTML =
          '<div class="cart-empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 3h2l2.2 12.2a2 2 0 0 0 2 1.65h7.7a2 2 0 0 0 1.98-1.7L20 8H6.1"/></svg>' +
          "<p>Tu carrito está vacío</p>" +
          '<a href="#precios" class="btn btn-outline">Ver los Packs</a>' +
          "</div>";
        if (cartFoot) cartFoot.hidden = true;
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
            '<div style="display:flex;align-items:center;gap:.6rem;">' +
            '<span class="cart-item-total">' + formatPrice(item.qty * item.price) + "</span>" +
            '<button type="button" class="cart-item-remove" data-action="remove" aria-label="Quitar ' + item.name + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7"/></svg></button>' +
            "</div>" +
            "</div>" +
            "</div>";
        });
        cartBody.innerHTML = html;
        if (cartFoot) {
          cartFoot.hidden = false;
          if (cartTotalEl) cartTotalEl.textContent = formatPrice(cartTotal());
        }
      }
    }

    updateMobileBuyBar();
  }

  function bumpBadge() {
    if (!cartBadge) return;
    cartBadge.classList.remove("bump");
    void cartBadge.offsetWidth;
    cartBadge.classList.add("bump");
  }

  function openCart() {
    if (!cartDrawer) return;
    closeCheckout();
    cartDrawer.classList.add("is-open");
    if (cartBackdrop) cartBackdrop.classList.add("is-open");
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-open");
  }

  function closeCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove("is-open");
    if (cartBackdrop) cartBackdrop.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cart-open");
  }

  if (cartToggle) {
    cartToggle.addEventListener("click", function () {
      if (cartDrawer && cartDrawer.classList.contains("is-open")) {
        closeCart();
      } else {
        openCart();
      }
    });
  }
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

  if (cartBody) {
    cartBody.addEventListener("click", function (e) {
      var link = e.target.closest("a");
      if (link) {
        closeCart();
        return;
      }
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
      openCart();
      bumpBadge();

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

  /* ---------- Checkout ---------- */
  var checkoutModal = document.getElementById("checkoutModal");
  var checkoutBackdrop = document.getElementById("checkoutBackdrop");
  var checkoutClose = document.getElementById("checkoutClose");
  var checkoutForm = document.getElementById("checkoutForm");
  var checkoutSummary = document.getElementById("checkoutSummary");
  var checkoutFormView = document.getElementById("checkoutFormView");
  var checkoutSuccessView = document.getElementById("checkoutSuccessView");
  var checkoutWspLink = document.getElementById("checkoutWspLink");
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

  function openCheckout() {
    if (!checkoutModal || cartIds().length === 0) return;
    closeCart();
    renderCheckoutSummary();
    if (checkoutFormView) checkoutFormView.hidden = false;
    if (checkoutSuccessView) checkoutSuccessView.hidden = true;
    checkoutModal.classList.add("is-open");
    if (checkoutBackdrop) checkoutBackdrop.classList.add("is-open");
    checkoutModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-open");
    window.setTimeout(function () {
      if (ckName) ckName.focus();
    }, 350);
  }

  function closeCheckout() {
    if (!checkoutModal) return;
    checkoutModal.classList.remove("is-open");
    if (checkoutBackdrop) checkoutBackdrop.classList.remove("is-open");
    checkoutModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cart-open");
  }

  if (cartCheckoutBtn) cartCheckoutBtn.addEventListener("click", openCheckout);
  if (checkoutClose) checkoutClose.addEventListener("click", closeCheckout);
  if (checkoutBackdrop) checkoutBackdrop.addEventListener("click", closeCheckout);

  function buildOrderMessage(name, email) {
    var lines = [];
    lines.push("Hola, quiero confirmar mi compra en MayoristasYa.");
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
    lines.push("Alias: MayoristasYa");
    lines.push("CBU: 0000147800000070818699");
    lines.push("Titular: Maximiliano Gabriel");
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
      var url = "https://wa.me/" + WSP_NUMBER + "?text=" + encodeURIComponent(message);

      if (checkoutWspLink) checkoutWspLink.setAttribute("href", url);
      if (checkoutFormView) checkoutFormView.hidden = true;
      if (checkoutSuccessView) checkoutSuccessView.hidden = false;

      window.open(url, "_blank", "noopener");

      cart = {};
      saveCart();
      renderCart();
    });
  }

  loadCart();
  renderCart();

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");

  function closeNav() {
    navToggle.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
  }

  navToggle.addEventListener("click", function () {
    var isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    mobileNav.classList.toggle("is-open");
    document.body.classList.toggle("nav-open");
  });

  mobileNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeNav();
      closeCart();
      closeCheckout();
    }
  });

  /* ---------- FAQ accordion ---------- */
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
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll(".stat-num[data-count]");

  function animateCounter(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var suffix = el.getAttribute("data-suffix") || "";
    var duration = 1400;
    var start = null;

    function step(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.floor(eased * target);
      el.textContent = value.toLocaleString("es-AR") + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = target.toLocaleString("es-AR") + suffix;
      }
    }
    window.requestAnimationFrame(step);
  }

  if (counters.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      counters.forEach(function (el) {
        var target = parseInt(el.getAttribute("data-count"), 10);
        el.textContent = target.toLocaleString("es-AR") + (el.getAttribute("data-suffix") || "");
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
