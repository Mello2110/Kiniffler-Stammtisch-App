import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, setDoc, query, orderBy } from 'firebase/firestore';

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
console.log("Fetching transactions & members...");
const transSnap = await getDocs(collection(db, "tokenTransactions"));
const membersSnap = await getDocs(collection(db, "members"));

console.log("Deleting all token transactions...");
const deletePromises = [];
transSnap.docs.forEach((d) => {
    deletePromises.push(deleteDoc(doc(db, "tokenTransactions", d.id)));
});
await Promise.all(deletePromises);
console.log("All transactions deleted!");

const now = new Date();
const members = membersSnap.docs.map(m => ({ id: m.id, ...m.data() }));

console.log("Creating Startguthaben for everyone...");
for (const member of members) {
    const id = "start_" + member.id;
    await setDoc(doc(db, "tokenTransactions", id), {
    id: id,
    memberId: member.id,
    type: "normal",
    amount: 2,
    reason: "Startguthaben",
    timestamp: now,
    });
}

// Find "Architekt" alias Marcel? Or who is it? The user said "Marcel"?
// "der architekt" - let's find member with name "Architekt" or "Marcel".
let architektId = null;
for(const m of members) {
    if ((m.name && m.name.toLowerCase().includes("architekt")) || (m.role && m.role.toLowerCase().includes("architekt")) || m.name === "Marcel" || m.name === "Kevin" || m.id === "1") {
        if(m.name === "Kevin" || m.name === "Marcel") {
            console.log("Found member: ", m.name);
        }
    }
}
// Actually, let's just create an entry for Architekt if we can find who the Architekt is.
// I will output the members so I can see their names.
members.forEach(m => console.log(m.id, m.name));
}

run().catch(console.error).finally(() => process.exit(0));
