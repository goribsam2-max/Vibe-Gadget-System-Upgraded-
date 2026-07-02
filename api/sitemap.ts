import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

export default async function handler(req, res) {
  try {
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);
    let urls = "";
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name) {
        const slug = toSlug(data.name);
        urls += `
  <url>
    <loc>https://www.vibegadgets.shop/${slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
      }
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.vibegadgets.shop/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.vibegadgets.shop/all-products</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>${urls}
</urlset>
`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    res.status(200).send(sitemap);
  } catch (err) {
    console.error("Error generating sitemap:", err);
    res.status(500).send("Error generating sitemap");
  }
}
