const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Remove the broken part I added at the top
code = code.replace(/const isProd = process\.env\.NODE_ENV === "production" \|\| process\.env\.VERCEL;[\s\S]*?app\.use\(vite\.middlewares\);\n      \}\n  \}/, '');

// The bottom of server.ts currently ends abruptly with:
// if (!process.env.VERCEL) {
//     setupVite().then(() => {
//         app.listen(PORT, "0.0.0.0", () => {
//             console.log(`Server running on http://localhost:${PORT}`);
//         });
//     });
// }
code = code.replace(/if \(!process\.env\.VERCEL\) \{\n[\s]*setupVite\(\)\.then\(\(\) => \{\n[\s]*app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{\n[\s]*console\.log\(\`Server running on http:\/\/localhost:\$\{PORT\}\`\);\n[\s]*\}\);\n[\s]*\}\);\n[\s]*\}/, '');

fs.writeFileSync('server.ts', code);
