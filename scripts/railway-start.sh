#!/bin/sh
set -e

echo "→ Limpiando base de datos..."
rm -f /data/db.sqlite

echo "→ Inicializando base de datos..."
npx prisma db push --accept-data-loss

echo "→ Iniciando servidor..."
exec node .next/standalone/server.js
