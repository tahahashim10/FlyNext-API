// app/hotels/route.js
import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(request) {
  try {
    const { name, logo, address, location, starRating, images } = await request.json();

    // Validate required fields (adjust as needed)
    if (!name || !logo || !address || !location || starRating === undefined || !images) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create a new hotel record
    const hotel = await prisma.hotel.create({
      data: {
        name,
        logo,
        address,
        location,
        starRating,
        images, // Expected to be an array of URLs (e.g., ["url1", "url2"])
      },
    });

    return NextResponse.json(hotel, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const hotels = await prisma.hotel.findMany();
    return NextResponse.json(hotels, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
