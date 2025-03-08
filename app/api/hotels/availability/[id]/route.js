// app/api/hotels/availability/id/route.js
import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { verifyToken } from '@/utils/auth';

export async function POST(request, { params }) {

  // Verify token
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate the room ID parameter
  const { id } = params;
  const roomId = parseInt(id);
  if (!id || isNaN(roomId)) {
    return NextResponse.json({ error: "Valid room ID is required" }, { status: 400 });
  }

  try {
    const { availableRooms: newAvailable } = await request.json();

    if (newAvailable === undefined || typeof newAvailable !== 'number') {
      return NextResponse.json({ error: "availableRooms is required and must be a number" }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true },
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check that the authenticated user owns the hotel that this room belongs to
    if (room.hotel.ownerId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You do not own this hotel." }, { status: 403 });
    }

    const oldAvailable = room.availableRooms;
    let canceledBookings = [];

    if (newAvailable < oldAvailable) {
      // Find confirmed bookings for this room (order by checkIn descending to cancel the latest ones first)
      const confirmedBookings = await prisma.booking.findMany({
        where: {
          roomId: room.id,
          status: 'CONFIRMED'  // * important: we don't cancel bookings that are pending payment, we only cancel confirmed bookings
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
            const updatedBooking = await prisma.booking.update({
              where: { id: booking.id },
              data: { status: "CANCELED" }, 
            });
            // U22: Notify the user about the cancellation due to reduced availability
            await prisma.notification.create({
              data: {
                userId: updatedBooking.userId,
                message: `Your booking for room ${room.name} has been canceled due to reduced availability.`,
              },
            });
            return updatedBooking;
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
