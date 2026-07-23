import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDu8F3IySoh08XX82TbsPl3Z8p-9axyIZk',
  authDomain: 'detailgo-3991f.firebaseapp.com',
  projectId: 'detailgo-3991f',
  storageBucket: 'detailgo-3991f.firebasestorage.app',
  messagingSenderId: '1019714598702',
  appId: '1:1019714598702:web:ea09243fb46404a0876cbf',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', function () {
  const menuButton = document.querySelector('.menu-button');
  const mobileNav = document.querySelector('.mobile-nav');

  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', function () {
      const isOpen = mobileNav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });

    mobileNav.addEventListener('click', function (event) {
      if (event.target.tagName === 'A') {
        mobileNav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const form = document.querySelector('#detailerForm');
  const status = document.querySelector('#detailerFormStatus');
  const detailerDialog = document.querySelector('#detailerDialog');
  const openDetailerForm = document.querySelector('#openDetailerForm');
  const closeDetailerForm = document.querySelector('#closeDetailerForm');

  if (detailerDialog && openDetailerForm && closeDetailerForm) {
    openDetailerForm.addEventListener('click', function () {
      detailerDialog.showModal();
    });

    closeDetailerForm.addEventListener('click', function () {
      detailerDialog.close();
      openDetailerForm.focus();
    });

    detailerDialog.addEventListener('click', function (event) {
      if (event.target === detailerDialog) {
        detailerDialog.close();
        openDetailerForm.focus();
      }
    });
  }

  if (!form || !status) return;

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      address: String(formData.get('address') ?? '').trim(),
      zone: String(formData.get('zone') ?? '').trim(),
      experienceYears: 0,
      hasTransport: formData.get('hasTransport') === 'on',
      hasEquipment: formData.get('hasEquipment') === 'on',
      comment: String(formData.get('comment') ?? '').trim(),
      status: 'pending',
      source: 'web',
      createdAt: serverTimestamp(),
    };

    if (!payload.name || !payload.email || !payload.phone || !payload.address || !payload.zone) {
      status.textContent = 'Completa nombre, correo, telefono, direccion y area.';
      status.classList.add('error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      status.textContent = 'Escribe un correo valido.';
      status.classList.add('error');
      return;
    }

    submitButton.disabled = true;
    status.textContent = 'Enviando solicitud...';
    status.classList.remove('error');

    try {
      await addDoc(collection(db, 'applications'), payload);
      form.reset();
      status.textContent = 'Solicitud enviada. El administrador la revisara en la app.';
    } catch (error) {
      status.textContent = 'No se pudo enviar. Intenta otra vez.';
      status.classList.add('error');
    } finally {
      submitButton.disabled = false;
    }
  });
});
