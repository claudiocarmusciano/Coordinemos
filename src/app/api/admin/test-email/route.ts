import { NextResponse } from 'next/server'
import fs from 'fs'

// GET /api/admin/test-email?to=tucorreo@gmail.com
// Endpoint de diagnóstico — prueba el envío via Brevo API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to')

  // 1. Env var (bracket notation evita el inlining de webpack)
  const apiKeyEnv = (process.env as Record<string, string | undefined>)['MAIL_TOKEN']

  // 2. File-based fallback
  let apiKeyFile: string | undefined
  let fileStatus = 'not checked'
  try {
    const volumePath =
      (process.env as Record<string, string | undefined>)['RAILWAY_VOLUME_MOUNT_PATH'] || '/data'
    const keyFile = `${volumePath}/mail_token`
    fileStatus = `checking ${keyFile}`
    if (fs.existsSync(keyFile)) {
      const key = fs.readFileSync(keyFile, 'utf-8').trim()
      if (key) {
        apiKeyFile = key
        fileStatus = `OK (${key.length} chars) at ${keyFile}`
      } else {
        fileStatus = `file exists but is empty at ${keyFile}`
      }
    } else {
      fileStatus = `file not found at ${keyFile}`
    }
  } catch (e: any) {
    fileStatus = `error: ${e.message}`
  }

  const apiKey = apiKeyEnv || apiKeyFile

  const info: Record<string, any> = {
    MAIL_TOKEN_env: apiKeyEnv ? `OK (${apiKeyEnv.length} chars)` : 'UNDEFINED',
    MAIL_TOKEN_file: fileStatus,
    MAIL_TOKEN_resolved: apiKey ? `OK (${apiKey.length} chars)` : 'UNDEFINED — no source found',
    to: to || '(no especificado)',
    available_env_keys: Object.keys(process.env).sort(),
  }

  if (!apiKey) {
    return NextResponse.json({ ok: false, info, error: 'MAIL_TOKEN no disponible por ninguna vía' })
  }

  if (!to) {
    return NextResponse.json({ ok: false, info, error: 'Falta el parametro ?to=correo' })
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Coordinemos Test', email: 'coordinemosaplicacion@gmail.com' },
        to: [{ email: to }],
        subject: 'Test de email — Coordinemos',
        htmlContent: '<p>Si recibes este mail, el sistema de email esta funcionando correctamente!</p>',
      }),
    })

    const body = await response.text()

    if (!response.ok) {
      return NextResponse.json({ ok: false, info, error: `Brevo error ${response.status}`, detail: body })
    }

    return NextResponse.json({ ok: true, info, message: 'Email enviado correctamente — revisa tu bandeja' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, info, error: err.message })
  }
}
