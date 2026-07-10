/**
 * Update the REAL prices + detailer payouts on the existing catalog.
 *
 * New model (confirmed by the owner): each package has a client price AND a
 * fixed amount the detailer earns, both by vehicle type (SUV = truck). Extras
 * now have a fixed price and the detailer earns $5 per extra.
 *
 * Updates the EXISTING service docs (matched by name, so no duplicates) and the
 * extra docs (slug ids). Run once:
 *   ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node scripts/update-prices.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, collection, getDocs, doc, updateDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDu8F3IySoh08XX82TbsPl3Z8p-9axyIZk',
  authDomain: 'detailgo-3991f.firebaseapp.com',
  projectId: 'detailgo-3991f',
  storageBucket: 'detailgo-3991f.firebasestorage.app',
  messagingSenderId: '1019714598702',
  appId: '1:1019714598702:web:ea09243fb46404a0876cbf',
};

// sedanPrice, suvPrice (=truck), detailer pay sedan / suv(=truck)
const SERVICES = {
  'Express Wash':   { sedan: 40,  suv: 45,  paySedan: 35,  paySuv: 40 },
  'Lavada Regular': { sedan: 55,  suv: 60,  paySedan: 45,  paySuv: 50 },
  'Premium Wash':   { sedan: 95,  suv: 95,  paySedan: 75,  paySuv: 75 },
  'Clay Bar':       { sedan: 130, suv: 130, paySedan: 110, paySuv: 110 },
  'Ditel':          { sedan: 180, suv: 180, paySedan: 160, paySuv: 160 },
  'Full Ditel':     { sedan: 230, suv: 230, paySedan: 190, paySuv: 190 },
};

// extra price; the detailer always earns $5 per extra (or per unit).
// `perUnit` extras (shampoo) are priced per seat: client picks the quantity.
const EXTRAS = {
  'pelo-mascotas': { price: 15 },
  'manchas-agua': { price: 25 },
  'shampoo-asientos': { price: 15, perUnit: true, unitLabel: 'asiento' },
  'cera': { price: 25 },
  'restauracion-faros': { price: 25 },
};
const EXTRA_DETAILER_PAY = 5;

async function main() {
  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
  if (!email || !password) { console.error('Falta ADMIN_EMAIL / ADMIN_PASSWORD.'); process.exit(1); }

  const app = initializeApp(firebaseConfig);
  await signInWithEmailAndPassword(getAuth(app), email, password);
  const db = getFirestore(app);

  console.log('Actualizando servicios…');
  const snap = await getDocs(collection(db, 'services'));
  for (const d of snap.docs) {
    const cfg = SERVICES[d.data().name];
    if (!cfg) { console.log(`  (omitido: ${d.data().name})`); continue; }
    const suvSurcharge = cfg.suv - cfg.sedan;
    await updateDoc(doc(db, 'services', d.id), {
      basePrice: cfg.sedan,
      surcharges: { suv: suvSurcharge, truck: suvSurcharge },
      detailerPay: { sedan: cfg.paySedan, suv: cfg.paySuv, truck: cfg.paySuv },
      updatedAt: serverTimestamp(),
    });
    console.log(`  ✓ ${d.data().name}: cliente ${cfg.sedan}/${cfg.suv}, detailer ${cfg.paySedan}/${cfg.paySuv}`);
  }

  console.log('Actualizando extras…');
  for (const [slug, cfg] of Object.entries(EXTRAS)) {
    await setDoc(doc(db, 'extras', slug), {
      price: cfg.price,
      detailerPay: EXTRA_DETAILER_PAY,
      perUnit: !!cfg.perUnit,
      unitLabel: cfg.unitLabel ?? null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log(`  ✓ ${slug}: $${cfg.price}${cfg.perUnit ? '/' + cfg.unitLabel : ''} (detailer +$${EXTRA_DETAILER_PAY})`);
  }

  console.log('\nListo. Precios reales actualizados.');
  process.exit(0);
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
