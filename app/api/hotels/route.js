// app/api/hotels/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/utils/db';

export async function POST(request) {
  try {
    const { ownerId, name, logo, address, location, starRating, images } = await request.json();

    // Validate required fields (ownerId, name, address, location, starRating are required)
    if (!ownerId || !name || !address || !location || starRating === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create a new hotel, connecting the hotel with an existing owner using ownerId
    const hotel = await prisma.hotel.create({
      data: {
        name,
        logo,
        address,
        location,
        starRating,
        images,
        owner: {
          connect: { id: ownerId },
        },
      },
    });

    return NextResponse.json(hotel, { status: 201 });
  } catch (error) {
    console.error('Error creating hotel:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // Retrieve all hotels
    const hotels = await prisma.hotel.findMany();
    return NextResponse.json(hotels, { status: 200 });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
