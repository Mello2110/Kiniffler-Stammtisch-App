import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
apiKey: "AIzaSyCFa09-8DVF8o2OQssr15lZJ-aCIvh21HM",
authDomain: "webapp-stammtisch.firebaseapp.com",
projectId: "webapp-stammtisch",
storageBucket: "webapp-stammtisch.firebasestorage.app",
messagingSenderId: "112239637478",
appId: "1:112239637478:web:78a18a3671f33605801c27",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
const id = "host_stammtisch_2026";
await setDoc(doc(db, "tokenTransactions", id), {
    id: id,
    memberId: "e93N1GhNvVUWKlW2ELWcFcwPsyf1",
    type: "normal",
    amount: 1,
    reason: "Ausrichten des Stammtischs",
    timestamp: new Date()
});
console.log("+1 Token for Architekt added.");
}

run().catch(console.error).finally(() => process.exit(0));
