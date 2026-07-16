/** Solo lectura: lista los servicios reales con precio y pago al detailer. */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDu8F3IySoh08XX82TbsPl3Z8p-9axyIZk',
  authDomain: 'detailgo-3991f.firebaseapp.com',
  projectId: 'detailgo-3991f',
  storageBucket: 'detailgo-3991f.firebasestorage.app',
  messagingSenderId: '1019714598702',
  appId: '1:1019714598702:web:ea09243fb46404a0876cbf',
};

async function main() {
  const app = initializeApp(firebaseConfig);
  await signInWithEmailAndPassword(getAuth(app), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, 'services'));
  const rows = snap.docs.map(d => d.data()).sort((a,b)=>(a.order||0)-(b.order||0));
  console.log('nombre            | precio | pago detailer (sedan) | margen negocio');
  for (const s of rows) {
    const pay = s.detailerPay?.sedan ?? '-';
    const margin = (typeof pay === 'number') ? (s.basePrice - pay) : '-';
    const flag = (typeof margin === 'number' && margin < 0) ? '  ⚠️ NEGOCIO PIERDE' : '';
    console.log(`${(s.name||'').padEnd(17)} | $${String(s.basePrice).padStart(4)} | $${String(pay).padStart(4)}                 | $${String(margin).padStart(4)}${flag}`);
  }
  process.exit(0);
}
main().catch(e => { console.error('Error:', e.message || e); process.exit(1); });
