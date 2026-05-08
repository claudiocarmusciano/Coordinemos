#!/bin/sh
set -e

echo "→ Inicializando base de datos..."
./node_modules/.bin/prisma db push

echo "→ Iniciando servidor..."
exec node server.js
