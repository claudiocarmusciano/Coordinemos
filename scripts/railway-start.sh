#!/bin/sh
set -e

echo "→ Inicializando base de datos..."
bunx prisma db push

echo "→ Iniciando servidor..."
HOSTNAME=0.0.0.0 exec bun .next/standalone/server.js
