// src/services/mailer/transport.ts
import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  pool: true,                        // ← conexiones persistentes
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true', // true => 465
  auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },

  // Tiempos razonables (evita colgadas largas)
  connectionTimeout: 5000,           // connect
  greetingTimeout: 5000,             // EHLO
  socketTimeout: 10000,              // DATA/QUIT

  // Suaviza bursts y reutiliza
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,                   // ventana 1s
  rateLimit: 10,                     // 10 mensajes/seg

  // Diagnóstico (apágalo en prod si no lo necesitas)
  logger: true,                      // logs básicos
  debug: true,                       // logs detallados
  // family: 4,                      // fuerza IPv4 si tu DNS/ISP lía IPv6
  // tls: { servername: process.env.SMTP_HOST } // a veces ayuda con SNI
});
