import { NextResponse } from 'next/server'
import fs from 'fs'

// GET /api/admin/setup-mail-token?jwt=JWT_SECRET_VALUE&token=BREVO_API_KEY
// One-time endpoint to write the Brevo API key to the Railway volume.
// Protected by JWT_SECRET so only someone with server access can use it.
// DELETE THIS FILE after confirming email works.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const jwt = searchParams.get('jwt')
  const token = searchParams.get('token')

  // Authorization: must know the JWT_SECRET
  const expectedSecret = (process.env as Record<string, string | undefined>)['JWT_SECRET']
  if (!expectedSecret || jwt !== expectedSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!token || !token.trim()) {
    return NextResponse.json({ error: 'Falta el parámetro ?token=BREVO_API_KEY' }, { status: 400 })
  }

  try {
    const volumePath =
      (process.env as Record<string, string | undefined>)['RAILWAY_VOLUME_MOUNT_PATH'] || '/data'
    const keyFile = `${volumePath}/mail_token`
    fs.writeFileSync(keyFile, token.trim(), { mode: 0o600 })
    return NextResponse.json({
      ok: true,
      message: `Clave guardada en ${keyFile} (${token.trim().length} chars). Ahora probá /api/admin/test-email`,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
