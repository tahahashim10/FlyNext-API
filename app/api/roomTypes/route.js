import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(request) {
  try {
    const { hotelId, name, amenities, pricePerNight, images, availableRooms } = await request.json();

    // Validate required fields
    if (!hotelId || !name || pricePerNight === undefined || availableRooms === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: hotelId, name, pricePerNight, or availableRooms' },
        { status: 400 }
      );
    }

    // Create a new room record (room type)
    const room = await prisma.room.create({
      data: {
        hotelId,
        name,
        amenities,      // Expect an array of amenity strings
        pricePerNight,
        images,         // Expect an array of image URLs
        availableRooms,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // Optionally, you can add filtering by hotelId or name using query parameters
    const rooms = await prisma.room.findMany();
    return NextResponse.json(rooms, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
