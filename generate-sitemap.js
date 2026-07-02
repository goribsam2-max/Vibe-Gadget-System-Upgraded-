import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyC1vnVFbzezdpqAxjU5GXgAxu63DN05eyE",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "vibegadgets-ae9d1.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "vibegadgets-ae9d1",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "vibegadgets-ae9d1.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "50155075863",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:50155075863:web:469bb97fffbd37767bdf52"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const toSlug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function generateSitemap() {
  try {
    console.log("Generating sitemap...");
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);
    let urls = "";
    
    const today = new Date().toISOString().split('T')[0];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name) {
        const slug = toSlug(data.name);
        const lastMod = data.updatedAt ? new Date(data.updatedAt.toMillis()).toISOString().split('T')[0] : (data.createdAt ? new Date(data.createdAt.toMillis()).toISOString().split('T')[0] : today);
        urls += `
  <url>
    <loc>https://www.vibegadgets.shop/${slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
      }
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.vibegadgets.shop/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.vibegadgets.shop/all-products</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>${urls}
</urlset>
`;

    fs.writeFileSync(path.resolve(process.cwd(), "dist/sitemap.xml"), sitemap);
    console.log("Sitemap generated successfully at dist/sitemap.xml");
    process.exit(0);
  } catch (err) {
    console.error("Error generating sitemap:", err);
    // Don't fail the build on sitemap error
    process.exit(0);
  }
}

generateSitemap();
