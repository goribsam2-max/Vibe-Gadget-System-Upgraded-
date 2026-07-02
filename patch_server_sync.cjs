const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/async function startServer\(\) \{/, `
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL;
`);

// The previous version had `const PORT = ...` right after startServer. We just replace that too.
code = code.replace(/const PORT = process\.env\.PORT \? parseInt\(process\.env\.PORT\) : 3000;\n/, '');

// Now we need to handle the Vite initialization and app.listen which should be async.
code = code.replace(/const isProd = process\.env\.NODE_ENV === "production";\n[\s]*let vite: any;[\s]*if \(!isProd\) \{[\s\S]*?\} else \{[\s\S]*?app\.use\(express\.static\(distPath, \{ index: false \}\)\);\n[\s]*\}/, `
  const distPath = path.resolve(process.cwd(), "dist");

  // Only use static serving in local production, not on Vercel
  if (isProd && !process.env.VERCEL) {
    app.use(express.static(distPath, { index: false }));
  }

  let vite: any;
  async function setupVite() {
      if (!isProd) {
          const { createServer: createViteServer } = await import("vite");
          vite = await createViteServer({
              server: { middlewareMode: true },
              appType: "spa",
          });
          app.use(vite.middlewares);
      }
  }
`);

// Now replace the end of startServer
code = code.replace(/app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{\n[\s]*console\.log\(\`Server running on http:\/\/localhost:\$\{PORT\}\`\);\n[\s]*\}\);\n\}/, `
`);

code = code.replace(/if \(process\.env\.NODE_ENV !== 'production' \|\| !process\.env\.VERCEL\) \{\n[\s]*startServer\(\);\n\}/, `
  if (!process.env.VERCEL) {
      setupVite().then(() => {
          app.listen(PORT, "0.0.0.0", () => {
              console.log(\`Server running on http://localhost:\${PORT}\`);
          });
      });
  }
`);

fs.writeFileSync('server.ts', code);
