/* eslint-disable @typescript-eslint/no-explicit-any */

import { transporter } from './transport';
import { getLogoAsset } from './assets';
import { SentMessageInfo } from 'nodemailer';
import { buildResetEmailTemplate } from './builderHtml';

export type SendResetResult =
  | { ok: true; messageId: string; accepted: string[]; rejected: string[]; response: string }
  | { ok: false; error: string };

export async function sendResetCodeEmail(opts: {
  to: string;
  code: string;
  url: string;
  productName?: string;
}): Promise<SendResetResult> {
  const { to, code, productName = 'Pame Admin', url } = opts;
  const logoAsset = getLogoAsset(url);

  const { html, text } = buildResetEmailTemplate({
    productName: 'Pame Forms',
    code,
    palette: {
      primary: '#55B3E8',
      accent: '#C7E87B',
      primarySoft: '#EAF6FE',
      text: '#0F172A',
      muted: '#64748B',
      bg: '#F7FAFE',
      card: '#FFFFFF',
      border: '#E5E7EB',
    },
    showLogo: true,
  });


  try {
    const buffer = Buffer.from(logoAsset.base64, 'base64');
    const info: SentMessageInfo = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `${productName} • Código de verificación`,
      html,
      text,
      attachments: logoAsset.base64
        ? [{
          filename: 'logo.png',
          content: buffer,
          contentType: logoAsset.mime,
          encoding: 'base64',
          cid: 'app-logo',
        }]
        : [],
    });

    return {
      ok: true,
      messageId: info.messageId ?? '',
      accepted: (info.accepted as string[]) ?? [],
      rejected: (info.rejected as string[]) ?? [],
      response: String(info.response ?? ''),
    };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Error enviando correo' };
  }
}
