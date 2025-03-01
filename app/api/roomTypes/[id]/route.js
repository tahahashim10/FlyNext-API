import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const room = await prisma.room.findUnique({
      where: { id: parseInt(id) },
    });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    return NextResponse.json(room, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { name, amenities, pricePerNight, images, availableRooms } = await request.json();

    // Check if the room exists
    const existingRoom = await prisma.room.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Update only the provided fields
    const updatedRoom = await prisma.room.update({
      where: { id: parseInt(id) },
      data: {
        name: name !== undefined ? name : existingRoom.name,
        amenities: amenities !== undefined ? amenities : existingRoom.amenities,
        pricePerNight: pricePerNight !== undefined ? pricePerNight : existingRoom.pricePerNight,
        images: images !== undefined ? images : existingRoom.images,
        availableRooms: availableRooms !== undefined ? availableRooms : existingRoom.availableRooms,
      },
    });

    return NextResponse.json(updatedRoom, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // Check if the room exists
    const existingRoom = await prisma.room.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    await prisma.room.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Room deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
