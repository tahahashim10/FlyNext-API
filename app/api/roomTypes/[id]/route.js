import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { verifyToken } from '@/utils/auth';

export async function GET(request, { params }) {
  // Verify token
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
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

  try {
    const { id } = params;
    const { name, amenities, pricePerNight, images, availableRooms } = await request.json();

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
