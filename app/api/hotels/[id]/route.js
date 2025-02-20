// app/hotels/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const hotel = await prisma.hotel.findUnique({
      where: { id: parseInt(id) },
    });
    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }
    return NextResponse.json(hotel, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { name, logo, address, location, starRating, images } = await request.json();

    // Verify hotel exists
    const existingHotel = await prisma.hotel.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingHotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    // Update only fields that are provided
    const updatedHotel = await prisma.hotel.update({
      where: { id: parseInt(id) },
      data: {
        name: name !== undefined ? name : existingHotel.name,
        logo: logo !== undefined ? logo : existingHotel.logo,
        address: address !== undefined ? address : existingHotel.address,
        location: location !== undefined ? location : existingHotel.location,
        starRating: starRating !== undefined ? starRating : existingHotel.starRating,
        images: images !== undefined ? images : existingHotel.images,
      },
    });

    return NextResponse.json(updatedHotel, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // Verify hotel exists
    const existingHotel = await prisma.hotel.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingHotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    await prisma.hotel.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Hotel deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
