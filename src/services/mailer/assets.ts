/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/mailer/assets.ts
import fs from 'fs';
import path from 'path';

type Asset = { base64: string; mime: string };
const cache = new Map<string, Asset>();

function guessMimeByExt(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        case '.webp': return 'image/webp';
        case '.svg': return 'image/svg+xml';
        default: return 'application/octet-stream';
    }
}

/** Carga un archivo como base64 (con caché). Acepta ruta absoluta o relativa a __dirname. */
export function getLogoAsset(url: string): Asset {
    if (!url) return { base64: '', mime: 'image/png' };
    if (cache.has(url)) return cache.get(url)!;

    try {
        const abs = path.isAbsolute(url) ? url : path.resolve(__dirname, url);
        const base64 = fs.readFileSync(abs).toString('base64');
        const mime = guessMimeByExt(abs);
        const asset = { base64, mime };
        cache.set(url, asset);
        return asset;
    } catch (err: any) {
        console.log(err);
        return { base64: '', mime: 'image/png' };
    }
}
