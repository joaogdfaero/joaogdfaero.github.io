(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  /* ---------------- Idioma ----------------
     Ordem: escolha salva > idioma do navegador > fuso horário (Brasil/Portugal etc.) > inglês */
  var PT_TIMEZONES = /^(America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Belem|Maceio|Araguaina|Cuiaba|Campo_Grande|Manaus|Porto_Velho|Boa_Vista|Rio_Branco|Eirunepe|Noronha|Santarem)|Europe\/Lisbon|Atlantic\/(Azores|Madeira)|Africa\/(Luanda|Maputo))$/;

  function detectLang() {
    var saved = store("lang");
    if (saved === "pt" || saved === "en") return saved;
    var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < langs.length; i++) {
      var l = (langs[i] || "").toLowerCase();
      if (l.indexOf("pt") === 0) return "pt";
      if (l.indexOf("en") === 0) break;
    }
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (PT_TIMEZONES.test(tz)) return "pt";
    } catch (e) {}
    return "en";
  }

  var currentLang = "pt";

  function applyLang(lang) {
    var dict = (window.I18N || {})[lang];
    if (!dict) return;
    currentLang = lang;
    root.lang = lang === "pt" ? "pt-BR" : "en";
    document.title = dict["meta.title"];
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && dict["meta.description"]) metaDesc.setAttribute("content", dict["meta.description"]);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n")];
      if (v !== undefined) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n-aria")];
      if (v !== undefined) { el.setAttribute("aria-label", v); el.setAttribute("title", v); }
    });
    document.querySelectorAll(".lang-switch button").forEach(function (b) {
      var on = b.getAttribute("data-lang") === lang;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    // números formatados conforme o idioma
    document.querySelectorAll(".counter.done").forEach(function (el) {
      el.textContent = formatNum(+el.getAttribute("data-to"), el);
    });
  }

  document.querySelectorAll(".lang-switch button").forEach(function (b) {
    b.addEventListener("click", function () {
      var l = b.getAttribute("data-lang");
      store("lang", l);
      applyLang(l);
    });
  });

  /* Efeito de digitação na frase principal da seção inicial.
     Digita os nós de texto em ordem, preservando o HTML (ex.: o <span class="grad">). */
  var typeTimer;
  function typeLead() {
    var el = document.querySelector(".hero .lead");
    if (!el || reduceMotion) return;
    clearTimeout(typeTimer);
    el.style.minHeight = "";
    el.style.minHeight = el.offsetHeight + "px"; // reserva a altura final para nada abaixo "pular"
    var parts = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) parts.push({ node: walker.currentNode, text: walker.currentNode.nodeValue });
    parts.forEach(function (p) { p.node.nodeValue = ""; });
    var i = 0, j = 0;
    (function step() {
      if (i >= parts.length) { el.style.minHeight = ""; return; }
      var p = parts[i];
      j++;
      p.node.nodeValue = p.text.slice(0, j);
      if (j >= p.text.length) { i++; j = 0; }
      typeTimer = setTimeout(step, 34);
    })();
  }

  document.querySelectorAll(".lang-switch button").forEach(function (b) {
    b.addEventListener("click", typeLead);
  });

  applyLang(detectLang());
  setTimeout(typeLead, 350);

  /* ---------------- Tema ---------------- */
  var themeBtn = document.getElementById("themeToggle");
  themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { sessionStorage.setItem("theme", next); } catch (e) {}
  });

  /* ---------------- Menu mobile ---------------- */
  var menuBtn = document.getElementById("menuToggle");
  var navLinks = document.getElementById("navLinks");
  function closeMenu() {
    navLinks.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }
  menuBtn.addEventListener("click", function () {
    var open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navLinks.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });

  /* ---------------- Nav com sombra ao rolar + link ativo ---------------- */
  var nav = document.querySelector(".nav");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 10); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var sectionLinks = {};
  navLinks.querySelectorAll("a").forEach(function (a) { sectionLinks[a.getAttribute("href").slice(1)] = a; });
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && sectionLinks[e.target.id]) {
          Object.keys(sectionLinks).forEach(function (k) { sectionLinks[k].classList.remove("active"); });
          sectionLinks[e.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("section[id]").forEach(function (s) { spy.observe(s); });
  }

  /* ---------------- Contadores ---------------- */
  function formatNum(n, el) {
    if (el && el.getAttribute("data-format")) return n.toLocaleString(currentLang === "pt" ? "pt-BR" : "en-US");
    return String(n);
  }

  function runCounter(el) {
    var to = +el.getAttribute("data-to");
    var from = parseInt(el.textContent, 10) || 0;
    if (reduceMotion) { el.textContent = formatNum(to, el); el.classList.add("done"); return; }
    var dur = 1400, start = null;
    function tick(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatNum(Math.round(from + (to - from) * eased), el);
      if (p < 1) requestAnimationFrame(tick); else el.classList.add("done");
    }
    requestAnimationFrame(tick);
  }

  /* ---------------- Reveal ao rolar ---------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        e.target.querySelectorAll(".counter:not(.done)").forEach(runCounter);
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = (i % 3) * 70 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
    document.querySelectorAll(".counter").forEach(runCounter);
  }

  /* ---------------- Copiar contato ---------------- */
  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      function done() {
        btn.textContent = window.I18N[currentLang]["contact.copied"];
        btn.classList.add("copied");
        setTimeout(function () {
          btn.textContent = window.I18N[currentLang]["contact.copy"];
          btn.classList.remove("copied");
        }, 1600);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
