// app/api/hotels/route.js
import { NextResponse } from 'next/server';
import prisma from "@/utils/db";

export async function POST(request) {
  try {
    const { ownerId, name, logo, address, location, starRating, images } = await request.json();

    // Validate required fields (ownerId, name, address, location, starRating are required)
    if (!ownerId || !name || !address || !location || starRating === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if the owner exists
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!owner) {
      return NextResponse.json(
        { error: `Owner with id ${ownerId} not found. Please provide a valid owner id.` },
        { status: 400 }
      );
    }

    // Check that the user has the HOTEL_OWNER role
    if (owner.role !== 'HOTEL_OWNER') {
      return NextResponse.json(
        { error: `User with id ${ownerId} is not a hotel owner.` },
        { status: 400 }
      );
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
    console.error('Error creating hotel:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
