// Holt Text mit Positionen aus PDF oder Bild und macht daraus einen Entwurf.
// PDFs werden im Browser gelesen. Bilder laufen durch Tesseract: Das Programm wird einmalig
// aus dem Netz geladen, das Bild selbst verlässt das Gerät nicht.
import { CLASSES, BYN, FEATS } from './catalog.js';
import { SK } from './constants.js';
import { parseSheet, mergeDrafts } from './sheet-parse.js';

const TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
const PAGE_W = 595;
const lists = () => ({ classes: Object.keys(CLASSES), skills: SK.map(s => [s[0], s[1]]), spells: Object.values(BYN).filter(e => e.k === 'spell').map(e => e.n), feats: FEATS.map(f => f.n) });

async function loadPdf(data) {
  const pdfjs = await import('pdfjs-dist/build/pdf.min.mjs');
  await import('pdfjs-dist/build/pdf.worker.min.mjs');
  return pdfjs.getDocument({ data }).promise;
}
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = TESSERACT; s.crossOrigin = 'anonymous'; s.onload = () => ok(window.Tesseract); s.onerror = () => fail(new Error('ocr-load')); document.head.appendChild(s); });
}
/** Erkennt Text in einem Bild und liefert Stücke im Maßstab einer PDF-Seite. */
async function ocr(image, width, offset, onStatus) {
  const T = await loadTesseract();
  onStatus('ocr');
  const worker = await T.createWorker('eng', 1, { workerBlobURL: true });
  const { data } = await worker.recognize(image, {}, { blocks: true });
  await worker.terminate();
  const k = PAGE_W / width, out = [];
  for (const b of data.blocks || []) for (const p of b.paragraphs) for (const l of p.lines) {
    let cur = null;
    for (const w of l.words) {
      const gap = cur ? w.bbox.x0 - cur.x1 : 0, h = w.bbox.y1 - w.bbox.y0;
      if (cur && gap < h * 1.1) { cur.s += ' ' + w.text; cur.x1 = w.bbox.x1; } else { if (cur) out.push(cur); cur = { s: w.text, x0: w.bbox.x0, x1: w.bbox.x1, y: w.bbox.y1 }; }
    }
    if (cur) out.push(cur);
  }
  return out.map(i => ({ s: i.s, x: i.x0 * k, y: 842 - i.y * k - offset }));
}
async function imageWidth(file) {
  const url = URL.createObjectURL(file), img = new Image();
  try { img.src = url; await img.decode(); return img.naturalWidth; } finally { URL.revokeObjectURL(url); }
}
async function readPdf(file, onStatus) {
  const doc = await loadPdf(new Uint8Array(await file.arrayBuffer()));
  const items = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p), view = page.getViewport({ scale: 1 }), k = PAGE_W / view.width, offset = (p - 1) * 1000;
    const tc = await page.getTextContent();
    let n = 0;
    for (const it of tc.items) if (it.str.trim()) { items.push({ s: it.str, x: it.transform[4] * k, y: it.transform[5] * k - offset, w: it.width * k }); n++; }
    if (n < 15) { // gescanntes Blatt ohne Textebene
      const vp = page.getViewport({ scale: 2.5 }), c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      await page.render({ canvas: c, viewport: vp }).promise;
      items.push(...await ocr(c, vp.width, offset, onStatus));
    }
  }
  return items;
}
export const isSheetFile = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name) || /^image\//.test(f.type);

export async function readSheets(files, onStatus) {
  const drafts = [];
  for (const f of files) {
    const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
    drafts.push(parseSheet(isPdf ? await readPdf(f, onStatus) : await ocr(f, await imageWidth(f), 0, onStatus), lists()));
  }
  return mergeDrafts(drafts);
}
