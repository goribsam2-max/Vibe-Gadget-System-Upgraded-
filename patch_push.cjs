const fs = require('fs');
let code = fs.readFileSync('lib/push.ts', 'utf-8');

code = code.replace(/if \(!\('serviceWorker' in navigator\) \|\| !\('PushManager' in window\)\) \{[\s\S]*?return false;\n        \}/, `if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log("Web Push not supported");
            return { error: "Web Push is not supported by your browser" };
        }`);

code = code.replace(/const permission = await Notification.requestPermission\(\);\n        if \(permission !== 'granted'\) return false;/, `const permission = await Notification.requestPermission();
        if (permission !== 'granted') return { error: "Notification permission was denied. Please allow it in browser settings." };`);

code = code.replace(/if \(!res.ok\) \{[\s\S]*?return false;\n        \}/, `if (!res.ok) {
           console.error("Failed to fetch public key");
           return { error: "Failed to connect to push server" };
        }`);

code = code.replace(/\} catch \(e\) \{\n                     console.error\("Service worker registration failed", e\);\n                     return false;\n                 \}/, `} catch (e: any) {
                     console.error("Service worker registration failed", e);
                     return { error: "Service worker registration failed: " + e.message };
                 }`);

code = code.replace(/if \(!registration \|\| !registration.pushManager\) \{\n                 console.error\("No push manager available"\);\n                 return false;\n            \}/, `if (!registration || !registration.pushManager) {
                 console.error("No push manager available");
                 return { error: "Push manager is not available in your browser" };
            }`);

fs.writeFileSync('lib/push.ts', code);
