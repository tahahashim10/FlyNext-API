import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { verifyToken } from "@/utils/auth";

export async function POST(request) {

  // Verify token and get authenticated user info
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { hotelId, name, amenities, pricePerNight, images, availableRooms } = await request.json();

    // Validate required fields
    if (!hotelId || !name || pricePerNight === undefined || availableRooms === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: hotelId, name, pricePerNight, or availableRooms' },
        { status: 400 }
      );
    }

    // Check if the hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: { id: Number(hotelId) },
    });
    if (!hotel) {
      return NextResponse.json(
        { error: `Hotel with id ${hotelId} does not exist.` },
        { status: 400 }
      );
    }

    // Ensure the authenticated user owns the hotel
    if (hotel.ownerId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You do not own this hotel." }, { status: 403 });
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

// export async function GET(request) {
//   try {
//     // we cna add filtering by hotelId or name using query parameters
//     const rooms = await prisma.room.findMany();
//     return NextResponse.json(rooms, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
