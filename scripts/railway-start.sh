#!/bin/sh
set -e

echo "→ Inicializando base de datos..."
npx prisma db push

echo "→ Iniciando servidor..."
exec node .next/standalone/server.js
