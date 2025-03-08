#!/usr/bin/env bash

echo "Installing dependencies..."
npm install

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding cities and airports into the database..."
node scripts/fetchCitiesAirports.js

echo "Startup complete."
