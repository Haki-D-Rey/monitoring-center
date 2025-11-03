export type SendResetResult =
    | { ok: true; messageId: string; accepted: string[]; rejected: string[]; response: string }
    | { ok: false; error: string };