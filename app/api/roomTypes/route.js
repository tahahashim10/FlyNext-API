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

    // Validate required fields exist and are of correct type
    if (!hotelId || typeof hotelId !== 'number') {
      return NextResponse.json({ error: "hotelId is required and must be a number." }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || name.trim() === "") {
      return NextResponse.json({ error: "Hotel room name must be a non-empty string." }, { status: 400 });
    }
    if (!Array.isArray(amenities)) {
      return NextResponse.json({ error: "Amenities must be provided as an array of strings." }, { status: 400 });
    }
    for (const amenity of amenities) {
      if (typeof amenity !== 'string') {
        return NextResponse.json({ error: "Each amenity must be a string." }, { status: 400 });
      }
    }
    if (pricePerNight === undefined || typeof pricePerNight !== 'number') {
      return NextResponse.json({ error: "pricePerNight is required and must be a number." }, { status: 400 });
    }
    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return NextResponse.json({ error: "Images must be provided as an array." }, { status: 400 });
      }
      for (const img of images) {
        if (typeof img !== 'string') {
          return NextResponse.json({ error: "Each image URL must be a string." }, { status: 400 });
        }
        
        if (!isValidUrl(img)) {
          return NextResponse.json({ error: "Each image must be a valid URL." }, { status: 400 });
        }
      }
    }
    if (availableRooms === undefined || typeof availableRooms !== 'number') {
      return NextResponse.json({ error: "availableRooms is required and must be a number." }, { status: 400 });
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


// source: https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
function isValidUrl(string) {
  const urlRegex = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
  return urlRegex.test(string);
}
