import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfWorkerSrc = path.resolve(
  __dirname,
  '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
);

const destinationPaths = [
  path.resolve(__dirname, '../public/pdf.worker.min.js'),
  path.resolve(__dirname, '../dist/pdf.worker.min.js'),
];

try {
  const publicDir = path.resolve(__dirname, '../public');
  const distDir = path.resolve(__dirname, '../dist');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  for (const destPath of destinationPaths) {
    try {
      fs.copyFileSync(pdfWorkerSrc, destPath);
      console.log(`✅ PDF.js worker copied to ${destPath}`);
    } catch (err) {
      console.warn(`⚠️ Could not copy to ${destPath}: ${err.message}`);
    }
  }
} catch (error) {
  console.error('❌ Error copying PDF.js worker file:', error);
  process.exit(1);
} 