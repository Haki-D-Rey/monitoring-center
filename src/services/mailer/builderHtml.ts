export type BrandPalette = {
  primary: string;      // color principal (celeste del logo)
  accent?: string;      // acento suave (verde del logo)
  primarySoft?: string; // fondo suave para chips/controles
  text?: string;        // texto principal
  muted?: string;       // texto secundario
  bg?: string;          // fondo de página
  card?: string;        // fondo de tarjeta
  border?: string;      // bordes/dividers
};

export function buildResetEmailTemplate(opts: {
  productName: string;
  code: string;
  palette?: BrandPalette;
  showLogo?: boolean; // si adjuntas el logo por CID => true
}) {
  const {
    productName,
    code,
    showLogo = true,
    palette = {
      primary: '#55B3E8',      // celeste (logo)
      accent: '#C7E87B',       // verde lima (logo)
      primarySoft: '#EAF6FE',  // celeste muy suave
      text: '#0F172A',
      muted: '#64748B',
      bg: '#F7FAFE',
      card: '#FFFFFF',
      border: '#E5E7EB',
    },
  } = opts;

  const preheader = `Tu código de verificación es ${code}. Caduca en 10 minutos.`;

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${productName} • Código de verificación</title>
  <style>
    /* Estilos base claros (sin dark mode) */
    body, table, td, a { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    table { border-collapse: collapse !important; }
    .card { background: ${palette.card}; border: 1px solid ${palette.border}; border-radius: 18px; padding: 28px; }
    .title { margin: 0 0 6px; font-size: 22px; line-height: 30px; color: ${palette.text}; }
    .muted { color: ${palette.muted}; font-size: 14px; line-height: 22px; margin: 0 0 16px; }
    .code {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
      font-weight: 800; letter-spacing: 10px; font-size: 28px; text-align: center;
      border: 1px solid ${palette.border}; border-radius: 14px;
      background: #ffffff; color: ${palette.text};
      padding: 16px 14px; min-width: 280px; box-shadow: 0 6px 14px rgba(0,0,0,.04);
    }
    .chip {
      display:inline-block; background:${palette.primarySoft}; color:${palette.primary};
      font-weight:700; padding:8px 10px; border-radius:12px; font-size:12px;
    }
    .btn {
      display:inline-block; background:${palette.primary}; color:#ffffff; text-decoration:none;
      padding:12px 16px; border-radius:12px; font-weight:700; font-size:14px;
    }
    .btn:hover { filter: brightness(0.98); }
    .footer { color:#9CA3AF; font-size:12px; line-height:18px; margin:0; }
  </style>
</head>
<body style="margin:0;padding:0;background:${palette.bg};color:${palette.text};">
  <!-- Preheader oculto -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${palette.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:600px;">

        <!-- Header / Marca -->
        <tr>
          <td align="center" style="padding: 0 0 14px;">
            ${showLogo ? `
              <div style="display:inline-block;background:${palette.primarySoft};padding:10px;border-radius:14px;">
                <img src="cid:app-logo" width="44" height="44" alt="${productName} logo" style="width:44px;height:44px;border-radius:10px;" />
              </div>` : ''}
            <div style="height:8px;"></div>
            <span class="chip">${productName}</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td class="card">
            <h1 class="title">Código de verificación</h1>
            <p class="muted">Usa este código para recuperar tu contraseña en <strong>${productName}</strong>. Este código caduca en <strong>10 minutos</strong>.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-top:8px;">
                <div class="code">${code}</div>
              </td></tr>
            </table>

            <div style="height:16px;"></div>
            <table role="presentation" align="center" cellpadding="0" cellspacing="0">
              <tr><td>
                <p></p>
              </td></tr>
            </table>

            <div style="height:20px;"></div>
            <div style="height:1px;background:${palette.border};"></div>
            <div style="height:12px;"></div>

            <p class="muted" style="margin:0;">Si no solicitaste este código, puedes ignorar este mensaje.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:14px 6px;">
            <p class="footer">© ${new Date().getFullYear()} ${productName}. Todos los derechos reservados.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text =
`${productName}
Código de verificación: ${code}
Caduca en 10 minutos.
Si no solicitaste este código, ignora este correo.`;

  return { html, text };
}
