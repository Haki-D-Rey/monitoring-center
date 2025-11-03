/* eslint-disable @typescript-eslint/no-explicit-any */
import { MergeOptions } from "@src/types";


export function foldBracketFilters(src: Record<string, unknown>): Record<string, unknown> {
    const filters: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(src)) {
        // filters[foo]   ó   filters[foo][from|to]
        const m = key.match(/^filters\[(.+?)\](?:\[(from|to)\])?$/);
        if (!m) continue;

        const name = m[1] as string | undefined;
        const sub = m[2] as 'from' | 'to' | undefined;

        // asegura que name sea string no vacío
        if (!name) continue;

        if (sub) {
            // inicializa bucket como objeto
            const bucket = (filters[name] ??= {} as Record<string, unknown>) as Record<string, unknown>;
            bucket[sub] = val;
        } else {
            filters[name] = val;
        }
    }

    return filters;
}


export function mergeQueryJson(
    raw: { body: any; params: any; query: any },
    opts: MergeOptions = {}
) {
    const { allowedKeys = ["page", "pageSize", "q", "status", "roleId", "userId"], onError = "throw" } = opts;
    const q = raw.query ?? {};
    const src = q.query;

    if (typeof src !== "string") return raw;

    // Helpers
    const stripBOM = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
    const trimQuotes = (s: string) => s.replace(/^['"]+|['"]+$/g, "");

    const safeDecode = (s: string): string => {
        try { return decodeURIComponent(s); } catch { return s; }
    };

    /** Extrae el primer bloque JSON { ... } balanceado, respetando comillas / escapes */
    const extractBalancedObject = (s: string): string | null => {
        let i = 0;
        // Busca el primer '{'
        while (i < s.length && s[i] !== "{") i++;
        if (i === s.length) return null;

        let depth = 0;
        let inStr: '"' | "'" | null = null;
        let esc = false;

        for (let j = i; j < s.length; j++) {
            const ch = s[j];

            if (inStr) {
                if (esc) { esc = false; continue; }
                if (ch === "\\") { esc = true; continue; }
                if (ch === inStr) inStr = null;
                continue;
            }

            if (ch === '"' || ch === "'") { inStr = ch; continue; }
            if (ch === "{") depth++;
            else if (ch === "}") {
                depth--;
                if (depth === 0) return s.slice(i, j + 1);
            }
        }
        return null; // no cerró correctamente
    };

    // Flujo de parseo
    const s = stripBOM(safeDecode(src).trim());

    // 1) Intento directo
    const tryParse = (candidate: string) => {
        const value = JSON.parse(candidate);
        if (value === null || Array.isArray(value) || typeof value !== "object") {
            throw new Error("El JSON debe representar un objeto { ... }.");
        }
        return value as Record<string, unknown>;
    };

    let parsed: Record<string, unknown> | null = null;
    const errors: string[] = [];

    const attempts: Array<() => void> = [
        () => { parsed = tryParse(s); },                     // a) tal cual
        () => { const seg = extractBalancedObject(s); if (!seg) throw new Error("No se halló bloque JSON balanceado."); parsed = tryParse(seg); }, // b) bloque balanceado
        () => { parsed = tryParse(trimQuotes(s)); },         // c) sin comillas de extremos
    ];

    for (const step of attempts) {
        try { step(); break; }
        catch (e: any) { errors.push(e?.message ?? String(e)); }
    }

    if (!parsed) {
        const msg = `No se pudo parsear 'query' como JSON. Errores: ${errors.join(" | ")}`;
        if (onError === "throw") {
            const err: any = new Error(msg);
            err.status = 400;
            throw err;
        }
        // onError === "ignore"
        return raw;
    }

    // Seguridad: filtra solo allowedKeys y evita prototipo/constructor
    const safe: Record<string, unknown> = {};
    for (const key of Object.keys(parsed)) {
        if (!allowedKeys.includes(key)) continue;
        if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
        safe[key] = parsed[key];
    }

    return {
        ...raw,
        query: {
            ...q,
            ...safe, // page, pageSize, q, status, roleId (lo que haya)
        },
    };
}

export const clampInt = (v: unknown, min: number, max: number) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(Math.trunc(n), min), max);
};

export const parseBool = (v: unknown): boolean | undefined => {
    if (typeof v === 'boolean') return v;
    if (v === 'true') return true;
    if (v === 'false') return false;
    return undefined;
};

export const parseNumber = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};

export const parseDateOnly = (s?: string): Date | undefined => {
    if (!s) return undefined;
    // Acepta "YYYY-MM-DD" o ISO; si es YYYY-MM-DD, créalo en local y sin hora
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d;
};
