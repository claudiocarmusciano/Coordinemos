#!/bin/sh
set -e

echo "→ Inicializando base de datos..."
npx prisma db push --accept-data-loss

echo "→ Iniciando servidor..."
exec node .next/standalone/server.js
