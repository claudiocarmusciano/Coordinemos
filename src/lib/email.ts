import fs from 'fs'

// Generates a random temporary password (8 chars, easy to type)
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const BREVO_SENDER_EMAIL = 'coordinemosaplicacion@gmail.com'
const BREVO_SENDER_NAME = 'Coordinemos'

/**
 * Resolves the Brevo API key from multiple sources:
 * 1. MAIL_TOKEN env var (bracket notation to bypass webpack inlining)
 * 2. File on Railway volume: /data/mail_token (fallback when env injection fails)
 */
function getMailToken(): string | undefined {
  // 1. Env var — bracket notation bypasses Next.js/webpack build-time inlining
  const fromEnv = (process.env as Record<string, string | undefined>)['MAIL_TOKEN']
  if (fromEnv) return fromEnv

  // 2. File-based fallback: persists on Railway volume across redeployments
  try {
    const volumePath =
      (process.env as Record<string, string | undefined>)['RAILWAY_VOLUME_MOUNT_PATH'] || '/data'
    const keyFile = `${volumePath}/mail_token`
    if (fs.existsSync(keyFile)) {
      const key = fs.readFileSync(keyFile, 'utf-8').trim()
      if (key) return key
    }
  } catch {
    // Ignore file read errors (e.g. running locally without /data)
  }

  return undefined
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const apiKey = getMailToken()
  if (!apiKey) {
    console.warn('[email] MAIL_TOKEN not set — email not sent')
    return
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Brevo API error ${response.status}: ${error}`)
  }
}

// ─── Email templates ────────────────────────────────────────

export function buildWelcomeEmail(firstName: string, tempPassword: string) {
  return {
    subject: 'Bienvenido a Coordinemos — Tu contraseña temporal',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <div style="background: #18181b; border-radius: 12px; padding: 32px; color: #fff;">
          <div style="width: 56px; height: 56px; background: #9BFF00; border-radius: 12px;
                      display: flex; align-items: center; justify-content: center;
                      font-size: 28px; font-weight: bold; margin-bottom: 24px; color: #050505;">C</div>
          <h2 style="margin: 0 0 8px; font-size: 20px;">¡Hola, ${firstName}!</h2>
          <p style="color: #a1a1aa; margin: 0 0 24px;">
            Tu cuenta en <strong style="color:#fff;">Coordinemos</strong> fue creada por tu club.
            Usá los siguientes datos para ingresar:
          </p>
          <div style="background: #27272a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">Tu usuario (DNI)</p>
            <p style="margin: 0 0 16px; font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #fff;">(tu DNI)</p>
            <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">Contraseña temporal</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #9BFF00;">${tempPassword}</p>
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
          <div style="width: 56px; height: 56px; background: #9BFF00; border-radius: 12px;
                      display: flex; align-items: center; justify-content: center;
                      font-size: 28px; font-weight: bold; margin-bottom: 24px; color: #050505;">C</div>
          <h2 style="margin: 0 0 8px; font-size: 20px;">Restablecimiento de contraseña</h2>
          <p style="color: #a1a1aa; margin: 0 0 24px;">
            Hola <strong style="color:#fff;">${firstName}</strong>, recibimos una solicitud para restablecer tu contraseña.
            Esta es tu nueva contraseña temporal:
          </p>
          <div style="background: #27272a; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">Contraseña temporal</p>
            <p style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #9BFF00;">${tempPassword}</p>
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
