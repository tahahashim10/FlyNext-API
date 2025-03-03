// app/api/hotels/availability/route.js
import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hotelId = searchParams.get('hotelId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!hotelId || !startDate || !endDate) {
      return NextResponse.json({ error: "hotelId, startDate, and endDate are required" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all rooms for the hotel
    const rooms = await prisma.room.findMany({
      where: { hotelId: parseInt(hotelId) },
    });

    // For each room, compute the number of confirmed bookings overlapping the date range
    const results = await Promise.all(
      rooms.map(async (room) => {
        const bookingCount = await prisma.booking.count({
          where: {
            roomId: room.id,
            status: { not: 'CANCELED' },
            AND: [
              { checkIn: { lt: end } },
              { checkOut: { gt: start } }
            ],
          },
        });
        const availableForPeriod = room.availableRooms - bookingCount;
        return {
          roomId: room.id,
          roomType: room.name,
          totalRooms: room.availableRooms,
          booked: bookingCount,
          available: availableForPeriod < 0 ? 0 : availableForPeriod,
        };
      })
    );

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
