/**
 * Corrige los typos de los nombres de paquetes en el catálogo real:
 *   "Ditel"       -> "Detail"
 *   "Full Ditel"  -> "Full Detail"
 * Actualiza los docs EXISTENTes de `services` (por nombre, sin duplicar).
 * Uso:
 *   ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node scripts/rename-services.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDu8F3IySoh08XX82TbsPl3Z8p-9axyIZk',
  authDomain: 'detailgo-3991f.firebaseapp.com',
  projectId: 'detailgo-3991f',
  storageBucket: 'detailgo-3991f.firebasestorage.app',
  messagingSenderId: '1019714598702',
  appId: '1:1019714598702:web:ea09243fb46404a0876cbf',
};

const RENAMES = {
  'Ditel': 'Detail',
  'Full Ditel': 'Full Detail',
};

async function main() {
  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
  if (!email || !password) { console.error('Falta ADMIN_EMAIL / ADMIN_PASSWORD.'); process.exit(1); }

  const app = initializeApp(firebaseConfig);
  await signInWithEmailAndPassword(getAuth(app), email, password);
  const db = getFirestore(app);

  const snap = await getDocs(collection(db, 'services'));
  let changed = 0;
  for (const d of snap.docs) {
    const name = d.data().name;
    const nuevo = RENAMES[name];
    if (!nuevo) continue;
    await updateDoc(doc(db, 'services', d.id), { name: nuevo, updatedAt: serverTimestamp() });
    console.log(`  ✓ "${name}" -> "${nuevo}"`);
    changed++;
  }
  console.log(changed ? `\nListo. ${changed} paquete(s) renombrado(s).` : '\nNo se encontraron paquetes con esos nombres (¿ya estaban corregidos?).');
  process.exit(0);
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
