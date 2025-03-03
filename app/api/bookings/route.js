// app/bookings/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/utils/db';

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelId = searchParams.get('hotelId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const room = searchParams.get('room'); // partial filter for room type (i.e. room name)

    // Build filtering conditions for bookings.
    const whereClause = {};
    if (hotelId) {
      whereClause.hotelId = parseInt(hotelId);
    }
    // If filtering by dates, require non-null checkIn and checkOut.
    if (startDate) {
      whereClause.checkIn = { gte: new Date(startDate) };
    }
    if (endDate) {
      whereClause.checkOut = { lte: new Date(endDate) };
    }
    // For filtering by room type, check that a related room exists and its name contains the filter.
    if (room) {
      whereClause.room = {
        isNot: null,
        name: { contains: room, mode: 'insensitive' },
      };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        room: true,
        hotel: true,
      },
    });

    return NextResponse.json(bookings, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}