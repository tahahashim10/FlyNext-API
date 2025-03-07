import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
// Build URL for AFS API
const baseUrl = process.env.AFS_BASE_URL;
// Get API key
const apiKey = process.env.AFS_API_KEY;
if (!apiKey) {
    console.error("AFS API key is not configured");
    process.exit(1);
}

async function fetchCities() {
  const url = new URL('/api/cities', baseUrl);
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } });
  if (!res.ok) throw new Error(`Failed to fetch cities: ${res.status}`);
  return res.json();
}

async function fetchAirports() {
  const url = new URL('/api/airports', baseUrl);
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } });
  if (!res.ok) throw new Error(`Failed to fetch airports: ${res.status}`);
  return res.json();
}

async function main() {
  // 1) Clear out existing city/airport records
  await prisma.city.deleteMany({});
  await prisma.airport.deleteMany({});

  // 2) Fetch from AFS
  const citiesData = await fetchCities();     // Array of { city, country }
  const airportsData = await fetchAirports(); // Array of { id, code, name, city, country }

  // 3) Insert into the local DB
  await prisma.city.createMany({
    data: citiesData.map((c) => ({
      city: c.city,
      country: c.country
    })),
  });

  await prisma.airport.createMany({
    data: airportsData.map((a) => ({
      code: a.code,
      name: a.name,
      city: a.city,
      country: a.country,
    })),
  });

  console.log('Cities and airports fetched and stored locally.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
