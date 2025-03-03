// app/api/hotels/availability/id/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/utils/db';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { availableRooms: newAvailable } = await request.json();

    if (newAvailable === undefined) {
      return NextResponse.json({ error: "availableRooms is required" }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { id: parseInt(id) },
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const oldAvailable = room.availableRooms;
    let canceledBookings = [];

    if (newAvailable < oldAvailable) {
      // Find confirmed bookings for this room (order by checkIn descending to cancel the latest ones first)
      const confirmedBookings = await prisma.booking.findMany({
        where: {
          roomId: room.id,
          status: 'CONFIRMED'
        },
        orderBy: {
          checkIn: 'desc'
        }
      });

      const bookingsToCancelCount = confirmedBookings.length - newAvailable;
      if (bookingsToCancelCount > 0) {
        const bookingsToCancel = confirmedBookings.slice(0, bookingsToCancelCount);
        canceledBookings = await Promise.all(
          bookingsToCancel.map(async (booking) => {
            return prisma.booking.update({
              where: { id: booking.id },
              data: { status: "CANCELED" },
            });
          })
        );
      }
    }

    // Update the availableRooms field
    const updatedRoom = await prisma.room.update({
      where: { id: parseInt(id) },
      data: { availableRooms: newAvailable },
    });

    return NextResponse.json({ room: updatedRoom, canceledBookings }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
