#!/usr/bin/env bash

npm install

npx prisma migrate deploy

node scripts/fetchCitiesAirports.js
