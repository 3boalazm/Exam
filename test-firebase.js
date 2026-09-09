const fs = require("fs");
const admin = require("firebase-admin");

const cred = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
admin.initializeApp({ credential: admin.credential.cert(cred) });
admin.firestore()
  .collection("teachers").doc("ping-test").get()
  .then(d => { console.log("✅ Firestore reachable (exists=" + d.exists + ")"); process.exit(0); })
  .catch(e => { console.error("❌ FAIL:", e.message); process.exit(1); });