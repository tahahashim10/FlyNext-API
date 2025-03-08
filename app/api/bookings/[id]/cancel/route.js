import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { verifyToken } from '@/utils/auth';

export async function POST(request, { params }) {
  // Verify token
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ error: "Valid booking ID is required in the path" }, { status: 400 });
  }

  try {

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // check that the booking's hotel belongs to the provided owner.
    if (!booking.hotel || booking.hotel.ownerId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: This booking does not belong to your hotel" }, { status: 403 });
    }

    // Check if the booking is already cancelled
    if (booking.status === "CANCELED") {
      return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 });
    }
    // Update status to "CANCELED"
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELED' },
    });

    // U22: Notify the user about the cancellation by the hotel owner
    await prisma.notification.create({
      data: {
        userId: updatedBooking.userId,
        message: `Your booking at ${booking.hotel.name} has been canceled by the hotel owner. Please contact the hotel for further assistance.`,
      },
    });

    return NextResponse.json(updatedBooking, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
