/**
 * DetailGO — ES/EN language toggle for the marketing site.
 *
 * Spanish is the default text baked into the HTML. This file holds the English
 * strings and swaps them in/out when the user clicks the toggle. The choice is
 * remembered in localStorage; on the first visit we honour the browser language.
 *
 * Loaded as a plain (non-module) deferred script so it works under the site CSP
 * (`script-src 'self'`), with no inline JavaScript.
 */
(function () {
  'use strict';

  var EN = {
    // Nav
    'nav.about': 'About',
    'nav.services': 'Packages',
    'nav.app': 'App',
    'nav.work': 'Detailers',
    'nav.login': 'Log in',
    'nav.register': 'Sign up',

    // Hero
    'hero.eyebrow': 'Mobile car wash in Los Angeles',
    'hero.title': 'Your car spotless, without leaving home.',
    'hero.text': "No driving, no lines, no waiting. A detailer comes to you, washes your car, and you get on with your day. Book in minutes from the app.",
    'hero.cta': 'Book my wash',
    'hero.from': 'From',
    'trust.verified': 'Verified detailers',
    'trust.pricing': 'Clear pricing from $40',
    'trust.pay': 'Pay with Zelle, Venmo or cash',

    // About
    'about.title': "A mobile service built so you never waste time.",
    'about.text': 'DetailGO offers mobile car washing and detailing. You can browse packages, add your car, book, pay with Zelle, Venmo or cash, upload a photo of your car, and rate the service.',

    // Gallery
    'gallery.eyebrow': 'Our work',
    'gallery.title': 'Results you can see and feel',
    'gallery.text': 'Foam wash, spotless interiors and a professional shine, wherever you are.',
    'gallery.cap1': 'Exterior foam wash',
    'gallery.cap2': 'Interior detailing',
    'gallery.cap3': 'Professional finish',

    // Services
    'services.title': 'Choose the service for your car',
    'services.text': 'Prices for sedan. SUV and truck may vary.',
    'svc.express.desc': 'Quick exterior wash. SUV/truck $45.',
    'svc.regular.desc': 'Exterior + basic interior. SUV/truck $60.',
    'svc.premium.desc': 'Full exterior and interior with wax.',
    'svc.clay.desc': 'Paint decontamination with clay bar.',
    'svc.detail.desc': 'Thorough interior and exterior detailing.',
    'svc.fulldetail.desc': 'Complete detailing, includes seat and mat washing.',
    'svc.ext': 'Exterior wash',
    'svc.armor': 'Armor All on tires',
    'svc.glass': 'Window cleaning',
    'svc.vacuum': 'Vacuum',
    'svc.dash': 'Dashboard and console cleaning',
    'svc.cond': 'Conditioner on plastics and leather',
    'svc.wax': 'Spray Wax on paint',
    'svc.clay': 'Clay Bar on paint',
    'svc.dashdeep': 'Deep dashboard cleaning',
    'svc.plasticdeep': 'Deep plastic cleaning',
    'svc.seats': 'Seat and mat washing',
    'svc.book': 'Book in the app',

    // App section
    'app.eyebrow': 'iOS and Android app',
    'app.title': 'Appointments are booked inside DetailGO',
    'app.text': 'You browse packages, register your car, save your address, book the service, and pay from the app.',
    'app.card1.title': 'Book and pay',
    'app.card1.text': 'Browse packages, add cars, save addresses, pick a service, place an order, pay with Zelle/Venmo/cash, and rate the detailer.',
    'app.card2.title': 'Your info ready',
    'app.card2.text': 'Save your address, pick the right car, and upload photos so the service arrives with everything it needs.',
    'app.card3.title': 'History and rating',
    'app.card3.text': "Check your past washes and rate the service when it's done to keep DetailGO's quality high.",
    'app.cta.create': 'Create account and request service',
    'app.cta.have': 'I already have an account',
    'app.iphone': 'iPhone · Coming soon',
    'app.android': 'Download for Android (APK)',
    'app.browser': 'Use the app from your browser',
    'app.note': 'Android: download the APK and install it (enable "Install unknown apps"). iPhone and Google Play are coming soon. You can also book today from your browser.',

    // Work with us
    'work.eyebrow': 'Join the team',
    'work.title': 'Work with DetailGO',
    'work.text': 'Send your info so the admin can review your application from the app.',
    'work.cta': 'I want to be a detailer',

    // Detailer dialog + form
    'dialog.eyebrow': 'Detailer application',
    'dialog.intro': "Fill in your details. Your application reaches the admin inside their app.",
    'form.name': 'Full name',
    'form.phone': 'Phone',
    'form.address': 'Address',
    'form.zone': 'Area where you live',
    'form.hasTransport': 'I have a car',
    'form.hasEquipment': 'I have washing equipment',
    'form.comment': 'Comment',
    'form.comment_ph': 'Experience, schedule or important details',
    'form.submit': 'Submit application',

    // Footer
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms & Conditions',
    'footer.delete': 'Delete account'
  };

  var STORAGE_KEY = 'detailgo-lang';
  var original = {}; // key -> original Spanish text/placeholder

  function collect() {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      if (!(key in original)) original[key] = nodes[i].textContent;
    }
    var phNodes = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < phNodes.length; j++) {
      var pk = 'ph:' + phNodes[j].getAttribute('data-i18n-placeholder');
      if (!(pk in original)) original[pk] = phNodes[j].getAttribute('placeholder') || '';
    }
  }

  function apply(lang) {
    var en = lang === 'en';
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      nodes[i].textContent = en && EN[key] != null ? EN[key] : original[key];
    }
    var phNodes = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < phNodes.length; j++) {
      var pkey = phNodes[j].getAttribute('data-i18n-placeholder');
      phNodes[j].setAttribute('placeholder', en && EN[pkey] != null ? EN[pkey] : original['ph:' + pkey]);
    }
    document.documentElement.lang = en ? 'en' : 'es';
    var btn = document.getElementById('langToggle');
    if (btn) {
      btn.textContent = en ? 'ES' : 'EN';
      btn.setAttribute('aria-label', en ? 'Cambiar a espanol' : 'Switch to English');
    }
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  function initialLang() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'es') return saved;
    } catch (e) {}
    var browser = (navigator.language || navigator.userLanguage || '').toLowerCase();
    return browser.indexOf('en') === 0 ? 'en' : 'es';
  }

  function init() {
    collect();
    var btn = document.getElementById('langToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        apply(document.documentElement.lang === 'en' ? 'es' : 'en');
      });
    }
    apply(initialLang());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
