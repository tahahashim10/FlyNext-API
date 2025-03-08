import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { verifyToken } from '@/utils/auth';

export async function GET(request, { params }) {
  // Verify token
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "Valid room ID is required" }, { status: 400 });
  }

  try {
    
    // Retrieve room with its associated hotel
    const room = await prisma.room.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true },
    });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Ensure the authenticated user owns the hotel
    if (room.hotel.ownerId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You do not own this hotel." }, { status: 403 });
    }

    return NextResponse.json(room, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  // Verify token
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "Valid room ID is required" }, { status: 400 });
  }

  try {

    const { name, amenities, pricePerNight, images, availableRooms } = await request.json();

    // Ensure at least one field is provided for update
    if (
      name === undefined &&
      amenities === undefined &&
      pricePerNight === undefined &&
      images === undefined &&
      availableRooms === undefined
    ) {
      return NextResponse.json({ error: "At least one field must be provided for update" }, { status: 400 });
    }

    // Validate each input if provided
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return NextResponse.json({ error: "Room name must be a non-empty string." }, { status: 400 });
    }
    if (amenities !== undefined) {
      if (!Array.isArray(amenities)) {
        return NextResponse.json({ error: "Amenities must be provided as an array." }, { status: 400 });
      }
      for (const amenity of amenities) {
        if (typeof amenity !== "string") {
          return NextResponse.json({ error: "Each amenity must be a string." }, { status: 400 });
        }
      }
    }
    if (pricePerNight !== undefined && typeof pricePerNight !== "number") {
      return NextResponse.json({ error: "pricePerNight must be a number." }, { status: 400 });
    }
    if (availableRooms !== undefined && typeof availableRooms !== "number") {
      return NextResponse.json({ error: "availableRooms must be a number." }, { status: 400 });
    }
    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return NextResponse.json({ error: "Images must be provided as an array." }, { status: 400 });
      }
      for (const img of images) {
        if (typeof img !== "string") {
          return NextResponse.json({ error: "Each image URL must be a string." }, { status: 400 });
        }
        if (!isValidUrl(img)) {
          return NextResponse.json({ error: "Each image must be a valid URL." }, { status: 400 });
        }
      }
    }

    // Check if the room exists (with its hotel)
    const existingRoom = await prisma.room.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true },
    });
    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Ensure the authenticated user owns the hotel
    if (existingRoom.hotel.ownerId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You do not own this hotel." }, { status: 403 });
    }

    // Update only the provided fields
    const updatedRoom = await prisma.room.update({
      where: { id: parseInt(id) },
      data: {
        name: name ?? existingRoom.name,
        amenities: amenities ?? existingRoom.amenities,
        pricePerNight: pricePerNight ?? existingRoom.pricePerNight,
        images: images ?? existingRoom.images,
        availableRooms: availableRooms ?? existingRoom.availableRooms,
      },
    });

    return NextResponse.json(updatedRoom, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  // Verify token
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Valid room ID is required" }, { status: 400 });
    }

    // Check if the room exists (with its hotel)
    const existingRoom = await prisma.room.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true },
    });
    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Ensure the authenticated user owns the hotel
    if (existingRoom.hotel.ownerId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You do not own this hotel." }, { status: 403 });
    }

    await prisma.room.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Room deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// source: https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
function isValidUrl(string) {
  const urlRegex = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
  return urlRegex.test(string);
}
