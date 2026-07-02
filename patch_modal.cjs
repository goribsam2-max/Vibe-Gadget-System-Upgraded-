const fs = require('fs');
let code = fs.readFileSync('components/ui/NotificationPermissionModal.tsx', 'utf-8');

code = code.replace(/if \(subscription\) \{[\s]*notify/, `if (subscription) {
         localStorage.setItem('vibe_push_enabled', 'true');
         notify`);

fs.writeFileSync('components/ui/NotificationPermissionModal.tsx', code);
