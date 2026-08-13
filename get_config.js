import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "ai-studio-6f9c7f71-09ef-4c76-b941-94d790a38a13"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const docRef = doc(db, "systemConfig", "global_config");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    console.log("systemConfig:", docSnap.data());
  } else {
    console.log("No such document!");
  }
}
main();
