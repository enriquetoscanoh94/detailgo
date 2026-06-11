document.addEventListener('DOMContentLoaded', function () {

  /* ── BUBBLES ── */
  (function () {
    const container = document.getElementById('bubbles-container');
    const COUNT = 26;
    for (let i = 0; i < COUNT; i++) {
      const b     = document.createElement('div');
      b.className = 'bubble';
      const size  = Math.random() * 60 + 12;
      const left  = Math.random() * 98 + 1;
      const delay = Math.random() * 22;
      const dur   = Math.random() * 16 + 14;
      const drift = ((Math.random() - 0.5) * 140).toFixed(1) + 'px';
      b.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + left + '%;animation-duration:' + dur + 's;animation-delay:-' + delay + 's;--drift:' + drift + ';';
      container.appendChild(b);
    }
  })();

  /* ── CAROUSEL ── */
  const carouselTrack   = document.getElementById('carouselTrack');
  const carouselDots    = document.getElementById('carouselDots');
  const carouselCounter = document.getElementById('carouselCounter');
  const slides          = document.querySelectorAll('.carousel-slide');
  const SLIDE_COUNT     = slides.length;
  let carIdx = 0;

  slides.forEach(function (_, i) {
    const dot       = document.createElement('div');
    dot.className   = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.dataset.index = i;
    carouselDots.appendChild(dot);
  });

  function updateDots() {
    carouselDots.querySelectorAll('.carousel-dot').forEach(function (d, i) {
      d.classList.toggle('active', i === carIdx);
    });
    carouselCounter.textContent = (carIdx + 1) + ' / ' + SLIDE_COUNT;
  }

  function carouselGo(idx) {
    carIdx = (idx + SLIDE_COUNT) % SLIDE_COUNT;
    carouselTrack.style.transform = 'translateX(-' + (carIdx * 100) + '%)';
    updateDots();
  }

  carouselDots.addEventListener('click', function (e) {
    const dot = e.target.closest('.carousel-dot');
    if (dot) carouselGo(parseInt(dot.dataset.index, 10));
  });

  document.querySelector('.carousel-prev').addEventListener('click', function () { carouselGo(carIdx - 1); });
  document.querySelector('.carousel-next').addEventListener('click', function () { carouselGo(carIdx + 1); });

  carouselTrack.addEventListener('click', function (e) {
    const slide = e.target.closest('.carousel-slide');
    if (slide) openLightbox(parseInt(slide.dataset.index, 10));
  });

  let touchStartX = 0;
  carouselTrack.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  carouselTrack.addEventListener('touchend', function (e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) carouselGo(carIdx + (dx < 0 ? 1 : -1));
  });

  /* ── LIGHTBOX ── */
  const lightbox        = document.getElementById('lightbox');
  const lightboxContent = document.getElementById('lightbox-content');
  const lbCounterEl     = document.getElementById('lbCounter');
  let lbIdx = 0;

  function renderLb() {
    const slide = slides[lbIdx];
    const type  = slide.dataset.type;
    const src   = slide.dataset.src;
    lightboxContent.innerHTML = '';
    if (type === 'img') {
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'DetailGO';
      lightboxContent.appendChild(img);
    } else {
      const vid        = document.createElement('video');
      vid.src          = src;
      vid.controls     = true;
      vid.autoplay     = true;
      vid.playsInline  = true;
      lightboxContent.appendChild(vid);
    }
    lbCounterEl.textContent = (lbIdx + 1) + ' / ' + SLIDE_COUNT;
  }

  function openLightbox(idx) {
    lbIdx = idx;
    renderLb();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function lbMove(dir) {
    lbIdx = (lbIdx + dir + SLIDE_COUNT) % SLIDE_COUNT;
    renderLb();
  }

  function closeLightbox() {
    const vid = lightboxContent.querySelector('video');
    if (vid) { vid.pause(); vid.src = ''; }
    lightboxContent.innerHTML = '';
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  document.querySelector('.lb-prev').addEventListener('click', function () { lbMove(-1); });
  document.querySelector('.lb-next').addEventListener('click', function () { lbMove(1); });
  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });

  /* ── MOBILE MENU ── */
  const mobileMenu      = document.getElementById('mobileMenu');
  const navHamburger    = document.getElementById('navHamburger');
  const mobileMenuClose = document.getElementById('mobileMenuClose');

  function openMobileMenu() {
    mobileMenu.classList.add('open');
    navHamburger.classList.add('open');
    navHamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove('open');
    navHamburger.classList.remove('open');
    navHamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  navHamburger.addEventListener('click', openMobileMenu);
  mobileMenuClose.addEventListener('click', closeMobileMenu);
  mobileMenu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') closeMobileMenu();
  });

  /* ── THEME ── */
  const themeToggle = document.getElementById('themeToggle');
  const iconSun     = document.getElementById('iconSun');
  const iconMoon    = document.getElementById('iconMoon');
  let isDark = localStorage.getItem('theme') !== 'light';

  function applyTheme() {
    document.body.classList.toggle('light', !isDark);
    iconSun.style.display  = isDark ? '' : 'none';
    iconMoon.style.display = isDark ? 'none' : '';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  themeToggle.addEventListener('click', function () {
    isDark = !isDark;
    applyTheme();
  });

  applyTheme();

  /* ── LANGUAGE ── */
  const langToggle = document.getElementById('langToggle');
  let currentLang  = localStorage.getItem('lang') || 'es';

  function setLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    langToggle.textContent = lang === 'es' ? 'EN' : 'ES';
    document.querySelectorAll('[data-' + lang + ']').forEach(function (el) {
      el.innerHTML = el.getAttribute('data-' + lang);
    });
    localStorage.setItem('lang', lang);
  }

  langToggle.addEventListener('click', function () {
    setLang(currentLang === 'es' ? 'en' : 'es');
  });

  setLang(currentLang);

  /* ── BOOKING ── */
  const bookingOverlay      = document.getElementById('bookingOverlay');
  const bookingForm         = document.getElementById('bookingForm');
  const bookingTagEl        = document.getElementById('bookingTag');
  const bookingPriceDisplay = document.getElementById('bookingPriceDisplay');
  let bookingService = '';
  let bookingPrice   = '';

  function openBooking(service, price) {
    bookingService = service;
    bookingPrice   = price;
    bookingTagEl.textContent        = service;
    bookingPriceDisplay.textContent = price;
    document.querySelectorAll('.form-input[data-placeholder-' + currentLang + ']').forEach(function (el) {
      el.placeholder = el.getAttribute('data-placeholder-' + currentLang);
    });
    bookingOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { document.getElementById('bookingName').focus(); }, 50);
  }

  function closeBooking() {
    bookingOverlay.classList.remove('open');
    document.body.style.overflow = '';
    bookingForm.reset();
  }

  bookingOverlay.querySelector('.booking-close').addEventListener('click', closeBooking);
  bookingOverlay.addEventListener('click', function (e) {
    if (e.target === bookingOverlay) closeBooking();
  });

  document.querySelector('.services-grid').addEventListener('click', function (e) {
    const btn = e.target.closest('.service-book-btn');
    if (btn) openBooking(btn.dataset.service, btn.dataset.price);
  });

  bookingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const name    = document.getElementById('bookingName').value.trim();
    const address = document.getElementById('bookingAddress').value.trim();
    const phone   = document.getElementById('bookingPhone').value.trim();
    if (!name || !address || !phone) return;
    const isEs = currentLang === 'es';
    const msg  = isEs
      ? 'Hola DetailGO! Quiero reservar el servicio *' + bookingService + ' (' + bookingPrice + ')*.\n\nNombre: ' + name + '\nDirección: ' + address + '\nMi WhatsApp: ' + phone + '\n\n¡Gracias!'
      : 'Hi DetailGO! I want to book the *' + bookingService + ' (' + bookingPrice + ')* service.\n\nName: ' + name + '\nAddress: ' + address + '\nMy WhatsApp: ' + phone + '\n\nThank you!';
    window.open('https://wa.me/13107762980?text=' + encodeURIComponent(msg), '_blank');
    closeBooking();
  });

  /* ── SINGLE KEYDOWN HANDLER ── */
  document.addEventListener('keydown', function (e) {
    if (lightbox.classList.contains('open')) {
      if (e.key === 'Escape')           closeLightbox();
      else if (e.key === 'ArrowLeft')   lbMove(-1);
      else if (e.key === 'ArrowRight')  lbMove(1);
      return;
    }
    if (e.key === 'Escape') {
      if (mobileMenu.classList.contains('open'))     closeMobileMenu();
      if (bookingOverlay.classList.contains('open')) closeBooking();
    }
  });

});
