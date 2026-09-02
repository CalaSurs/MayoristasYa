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

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
