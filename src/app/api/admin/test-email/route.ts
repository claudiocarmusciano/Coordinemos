import { NextResponse } from 'next/server'

// GET /api/admin/test-email?to=tucorreo@gmail.com
// Endpoint de diagnóstico — prueba el envío via Brevo API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to')

  // Dot notation (puede quedar inlineada como undefined por webpack)
  const apiKeyDot = process.env.MAIL_TOKEN
  // Bracket notation (evita el inlining de webpack)
  const apiKey = (process.env as Record<string, string | undefined>)['MAIL_TOKEN']

  // Lista de nombres de variables disponibles (sin valores sensibles)
  const availableKeys = Object.keys(process.env).sort()

  const info: Record<string, any> = {
    MAIL_TOKEN_dot: apiKeyDot ? `OK (${apiKeyDot.length} chars)` : 'UNDEFINED - webpack inlined',
    MAIL_TOKEN_bracket: apiKey ? `OK (${apiKey.length} chars)` : 'UNDEFINED',
    to: to || '(no especificado)',
    available_env_keys: availableKeys,
  }

  if (!apiKey) {
    return NextResponse.json({ ok: false, info, error: 'MAIL_TOKEN no disponible en runtime' })
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
