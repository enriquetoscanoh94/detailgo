/**
 * Seed / upsert the Detail Go catalog into Firestore.
 *
 * Writes the 6 service packages + 5 extras used by the app and the website,
 * with prices matching detailgo.app (the "+$15" adjustment already applied).
 *
 * SAFE TO RE-RUN: each doc uses a stable slug id (setDoc), so running again
 * UPDATES the existing docs instead of creating duplicates.
 *
 * Auth: signs in with the admin account so Firestore rules (admin-only writes)
 * allow it. Credentials come from env vars — NEVER hard-code them here.
 *
 *   Windows PowerShell:
 *     $env:ADMIN_EMAIL="carwashdetailgo@gmail.com"; $env:ADMIN_PASSWORD="..."; node scripts/seed.mjs
 *   Git Bash:
 *     ADMIN_EMAIL="carwashdetailgo@gmail.com" ADMIN_PASSWORD="..." node scripts/seed.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDu8F3IySoh08XX82TbsPl3Z8p-9axyIZk',
  authDomain: 'detailgo-3991f.firebaseapp.com',
  projectId: 'detailgo-3991f',
  storageBucket: 'detailgo-3991f.firebasestorage.app',
  messagingSenderId: '1019714598702',
  appId: '1:1019714598702:web:ea09243fb46404a0876cbf',
};

// --- Catalog ---------------------------------------------------------------
// basePrice = sedan price (from detailgo.app). surcharges = extra charged on
// top for that vehicle type. ⚠️ CONFIRMAR los recargos de SUV/troca por paquete.
const SERVICES = [
  {
    slug: 'express-wash',
    name: 'Express Wash',
    description: 'Lavado rápido por fuera.',
    includes: ['Lavado por fuera', 'Armorol en llantas'],
    basePrice: 50,
    durationMinutes: 30,
    surcharges: { suv: 0, truck: 0 },
    order: 1,
  },
  {
    slug: 'lavada-regular',
    name: 'Lavada Regular',
    description: 'Exterior + interior básico.',
    includes: [
      'Lavado por fuera',
      'Armorol en llantas',
      'Limpieza de vidrios',
      'Aspirado',
      'Limpieza de tablero y consola',
    ],
    basePrice: 60,
    durationMinutes: 60,
    surcharges: { suv: 0, truck: 5 }, // web: troca $65 (+$5). SUV sin dato → 0
    order: 2,
  },
  {
    slug: 'premium-wash',
    name: 'Premium Wash',
    description: 'Exterior e interior completo con cera.',
    includes: [
      'Lavado por fuera',
      'Armorol en llantas',
      'Limpieza de vidrios',
      'Aspirado',
      'Acondicionador en plásticos y piel',
      'Spray Wax en pintura',
    ],
    basePrice: 95,
    durationMinutes: 90,
    surcharges: { suv: 0, truck: 10 }, // web: troca $105 (+$10). SUV sin dato → 0
    order: 3,
  },
  {
    slug: 'clay-bar',
    name: 'Clay Bar',
    description: 'Descontaminación de pintura con clay bar.',
    includes: [
      'Lavado por fuera',
      'Limpieza de vidrios',
      'Aspirado',
      'Clay Bar en pintura',
      'Spray Wax en pintura',
    ],
    basePrice: 135,
    durationMinutes: 120,
    surcharges: { suv: 0, truck: 0 },
    order: 4,
  },
  {
    slug: 'ditel',
    name: 'Detail',
    description: 'Detallado a fondo interior y exterior.',
    includes: [
      'Lavado por fuera',
      'Aspirado',
      'Limpieza profunda de tablero',
      'Clay Bar en pintura',
      'Limpieza profunda de plásticos',
    ],
    basePrice: 195,
    durationMinutes: 150,
    surcharges: { suv: 0, truck: 0 },
    order: 5,
  },
  {
    slug: 'full-ditel',
    name: 'Full Detail',
    description: 'Detallado completo, incluye lavado de sillones y carpeta.',
    includes: [
      'Lavado por fuera',
      'Limpieza de tablero y consola',
      'Clay Bar en pintura',
      'Spray Wax en pintura',
      'Lavado de sillones y carpeta',
    ],
    basePrice: 235,
    durationMinutes: 180,
    surcharges: { suv: 0, truck: 0 },
    order: 6,
  },
];

// Extras: no fixed price (quoted per vehicle).
const EXTRAS = [
  { slug: 'pelo-mascotas', name: 'Removedor de pelo de mascotas', order: 1 },
  { slug: 'manchas-agua', name: 'Removedor de manchas de agua', order: 2 },
  { slug: 'shampoo-asientos', name: 'Shampoo de asientos individuales', order: 3 },
  { slug: 'cera', name: 'Cera', order: 4 },
  { slug: 'restauracion-faros', name: 'Restauración de faros', order: 5 },
];

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Falta ADMIN_EMAIL / ADMIN_PASSWORD en variables de entorno.');
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log('Iniciando sesión como admin…');
  await signInWithEmailAndPassword(auth, email, password);

  console.log('Sembrando servicios…');
  for (const s of SERVICES) {
    const { slug, ...data } = s;
    await setDoc(
      doc(db, 'services', slug),
      { ...data, active: true, updatedAt: serverTimestamp() },
      { merge: true }
    );
    console.log(`  ✓ ${s.name} — $${s.basePrice}`);
  }

  console.log('Sembrando extras…');
  for (const e of EXTRAS) {
    const { slug, ...data } = e;
    await setDoc(
      doc(db, 'extras', slug),
      { ...data, description: '', active: true, updatedAt: serverTimestamp() },
      { merge: true }
    );
    console.log(`  ✓ ${e.name}`);
  }

  console.log('\nListo. Catálogo sembrado en Firestore.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error sembrando:', err.message || err);
  process.exit(1);
});
