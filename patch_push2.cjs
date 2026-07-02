const fs = require('fs');
let code = fs.readFileSync('lib/push.ts', 'utf-8');

// The user added:
// try {
//     const endpointHash = btoa(subscription.endpoint).replace(/[^a-zA-Z0-9]/g, '');
//     await setDoc(doc(db, "web_push_subscriptions", endpointHash), {
//         subscription: JSON.parse(JSON.stringify(subscription)),
//         uid: uid || null,
//         createdAt: new Date().getTime()
//     });
// } catch (err) {
//     console.error("Failed to save subscription to Firestore", err);
// }

code = code.replace(/try \{\n[\s]*const endpointHash = btoa\(subscription\.endpoint\)\.replace\(\/\[\^a-zA-Z0-9\]\/g, ''\);\n[\s]*await setDoc\(doc\(db, "web_push_subscriptions", endpointHash\), \{\n[\s]*subscription: JSON\.parse\(JSON\.stringify\(subscription\)\),\n[\s]*uid: uid \|\| null,\n[\s]*createdAt: new Date\(\)\.getTime\(\)\n[\s]*\}\);\n[\s]*\} catch \(err\) \{\n[\s]*console\.error\("Failed to save subscription to Firestore", err\);\n[\s]*\}/, '');

fs.writeFileSync('lib/push.ts', code);
