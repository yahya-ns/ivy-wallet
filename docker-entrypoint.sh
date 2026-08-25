#!/bin/sh
set -e

echo "Starting Ivy Wallet Web Application..."

# Ensure data directory exists
mkdir -p /app/data

# Sync Prisma database schema
echo "Running Prisma db push..."
npx prisma db push --skip-generate

# Seed default data if database was just initialized
if [ ! -f /app/data/seeded.lock ]; then
  echo "First run detected - Seeding initial Ivy Wallet data..."
  node prisma/seed.js || npx tsx prisma/seed.ts || true
  touch /app/data/seeded.lock
fi

echo "Starting Next.js Server on port ${PORT:-3000}..."
exec node server.js
