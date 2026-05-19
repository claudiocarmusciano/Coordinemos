#!/bin/sh
set -e

echo "→ Reseteando base de datos..."
rm -f /data/db.sqlite
npx prisma db push --accept-data-loss

echo "→ Iniciando servidor..."
exec node .next/standalone/server.js
