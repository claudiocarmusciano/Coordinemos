import nodemailer from 'nodemailer'

// Generates a random temporary password (8 chars, easy to type)
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // Gmail app password
    },
    connectionTimeout: 8000,  // 8s para conectar
    greetingTimeout: 8000,
    socketTimeout: 10000,
  })
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.warn('[email] GMAIL_USER or GMAIL_PASS not set — email not sent')
    return
  }
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `"Coordinemos" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  })
}

// ─── Email templates ────────────────────────────────────────

export function buildWelcomeEmail(firstName: string, tempPassword: string) {
  return {
    subject: 'Bienvenido a Coordinemos — Tu contraseña temporal',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <div style="background: #18181b; border-radius: 12px; padding: 32px; color: #fff;">
          <div style="width: 56px; height: 56px; background: #3b82f6; border-radius: 12px;
                      display: flex; align-items: center; justify-content: center;
                      font-size: 28px; font-weight: bold; margin-bottom: 24px;">C</div>
          <h2 style="margin: 0 0 8px; font-size: 20px;">¡Hola, ${firstName}!</h2>
          <p style="color: #a1a1aa; margin: 0 0 24px;">
            Tu cuenta en <strong style="color:#fff;">Coordinemos</strong> fue creada por tu club.
            Usá los siguientes datos para ingresar:
          </p>
          <div style="background: #27272a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">Tu usuario (DNI)</p>
            <p style="margin: 0 0 16px; font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #fff;">(tu DNI)</p>
            <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">Contraseña temporal</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #3b82f6;">${tempPassword}</p>
          </div>
          <p style="color: #a1a1aa; font-size: 13px; margin: 0;">
            Al ingresar por primera vez, el sistema te pedirá que elijas una nueva contraseña.
          </p>
        </div>
      </div>
    `,
  }
}

export function buildPasswordResetEmail(firstName: string, tempPassword: string) {
  return {
    subject: 'Coordinemos — Nueva contraseña temporal',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <div style="background: #18181b; border-radius: 12px; padding: 32px; color: #fff;">
          <div style="width: 56px; height: 56px; background: #3b82f6; border-radius: 12px;
                      display: flex; align-items: center; justify-content: center;
                      font-size: 28px; font-weight: bold; margin-bottom: 24px;">C</div>
          <h2 style="margin: 0 0 8px; font-size: 20px;">Restablecimiento de contraseña</h2>
          <p style="color: #a1a1aa; margin: 0 0 24px;">
            Hola <strong style="color:#fff;">${firstName}</strong>, recibimos una solicitud para restablecer tu contraseña.
            Esta es tu nueva contraseña temporal:
          </p>
          <div style="background: #27272a; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">Contraseña temporal</p>
            <p style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #3b82f6;">${tempPassword}</p>
          </div>
          <p style="color: #a1a1aa; font-size: 13px; margin: 0;">
            Ingresá con tu DNI y esta contraseña. Al iniciar sesión el sistema te pedirá que elijas una nueva.
            Si no solicitaste este cambio, ignorá este correo.
          </p>
        </div>
      </div>
    `,
  }
}
