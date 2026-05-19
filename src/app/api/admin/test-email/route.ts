import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// GET /api/admin/test-email?to=tucorreo@gmail.com
// Endpoint de diagnóstico — muestra exactamente qué pasa con el SMTP
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to')

  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_PASS

  const info: Record<string, any> = {
    GMAIL_USER: gmailUser ? `${gmailUser.slice(0, 3)}***@${gmailUser.split('@')[1]}` : '❌ NO CONFIGURADA',
    GMAIL_PASS: gmailPass ? `✅ configurada (${gmailPass.length} caracteres)` : '❌ NO CONFIGURADA',
    to: to || '(no especificado — agregá ?to=tucorreo@gmail.com)',
  }

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ ok: false, info, error: 'Variables de entorno faltantes' })
  }

  if (!to) {
    return NextResponse.json({ ok: false, info, error: 'Falta el parámetro ?to=correo' })
  }

  // Probar puerto 465
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })

    await transporter.verify()
    info.verify_465 = '✅ Conexión exitosa'

    await transporter.sendMail({
      from: `"Coordinemos Test" <${gmailUser}>`,
      to,
      subject: 'Test de email — Coordinemos',
      html: '<p>Si recibís este mail, el SMTP está funcionando correctamente.</p>',
    })

    return NextResponse.json({ ok: true, info, message: 'Email enviado correctamente' })
  } catch (err: any) {
    info.error_465 = err.message
    info.code = err.code

    // Probar también puerto 587 como fallback
    try {
      const transporter587 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: gmailUser, pass: gmailPass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      })
      await transporter587.verify()
      info.verify_587 = '✅ Puerto 587 funciona'
    } catch (err587: any) {
      info.error_587 = err587.message
    }

    return NextResponse.json({ ok: false, info, error: err.message })
  }
}
