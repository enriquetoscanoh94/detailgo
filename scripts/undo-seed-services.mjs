/**
 * Undo the duplicate service docs created by scripts/seed.mjs.
 *
 * The `services` collection already contained the 6 packages (auto-ids, with
 * the real detailed "includes"). The seed added a second copy under slug ids,
 * causing duplicates in the catalog. This deletes ONLY those slug docs.
 * The 5 extras are kept (they did not exist before).
 *
 *   ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node scripts/undo-seed-services.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDu8F3IySoh08XX82TbsPl3Z8p-9axyIZk',
  authDomain: 'detailgo-3991f.firebaseapp.com',
  projectId: 'detailgo-3991f',
  storageBucket: 'detailgo-3991f.firebasestorage.app',
  messagingSenderId: '1019714598702',
  appId: '1:1019714598702:web:ea09243fb46404a0876cbf',
};

const SLUGS = ['express-wash', 'lavada-regular', 'premium-wash', 'clay-bar', 'ditel', 'full-ditel'];

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Falta ADMIN_EMAIL / ADMIN_PASSWORD.');
    process.exit(1);
  }
  const app = initializeApp(firebaseConfig);
  await signInWithEmailAndPassword(getAuth(app), email, password);
  const db = getFirestore(app);

  for (const slug of SLUGS) {
    await deleteDoc(doc(db, 'services', slug));
    console.log(`  ✗ borrado services/${slug}`);
  }
  console.log('\nDuplicados eliminados. Quedan los 6 servicios originales.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
