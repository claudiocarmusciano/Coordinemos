FROM node:20-slim

WORKDIR /app

# Prisma requiere openssl
RUN apt-get update && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Instalar dependencias con npm
COPY package.json ./
RUN npm install

# Copiar código fuente
COPY . .

# Generar Prisma client para Linux
RUN npx prisma generate

# Build de Next.js (variables dummy para que no falle)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV JWT_SECRET=build-time-placeholder
ENV DATABASE_URL=file:/tmp/build.db
RUN npm run build

RUN mkdir -p /data

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["sh", "./scripts/railway-start.sh"]
