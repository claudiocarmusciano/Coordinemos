import { NextResponse } from 'next/server'

// GET /api/admin/test-email?to=tucorreo@gmail.com
// Endpoint de diagnóstico — prueba el envío via Brevo API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to')

  const apiKey = process.env.BREVO_API_KEY

  // Lista de nombres de variables disponibles (sin valores sensibles)
  const availableKeys = Object.keys(process.env).sort()

  const info: Record<string, any> = {
    BREVO_API_KEY: apiKey ? `✅ configurada (${apiKey.length} caracteres)` : '❌ NO CONFIGURADA',
    to: to || '(no especificado — agregá ?to=tucorreo@gmail.com)',
    available_env_keys: availableKeys,
  }

  if (!apiKey) {
    return NextResponse.json({ ok: false, info, error: 'BREVO_API_KEY no configurada' })
  }

  if (!to) {
    return NextResponse.json({ ok: false, info, error: 'Falta el parámetro ?to=correo' })
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
        htmlContent: '<p>Si recibís este mail, el sistema de email está funcionando correctamente ✅</p>',
      }),
    })

    const body = await response.text()

    if (!response.ok) {
      return NextResponse.json({ ok: false, info, error: `Brevo error ${response.status}`, detail: body })
    }

    return NextResponse.json({ ok: true, info, message: 'Email enviado correctamente — revisá tu bandeja' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, info, error: err.message })
  }
}
