import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { verifyToken } from '@/utils/auth';

export async function POST(request, { params }) {
  // Verify token
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;

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
    // Update status to "CANCELED"
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELED' },
    });

    // U22: Notify the user about the cancellation by the hotel owner
    await prisma.notification.create({
      data: {
        userId: updatedBooking.userId,
        message: `Your booking at ${booking.hotel.name} has been canceled by the hotel owner.`,
      },
    });

    return NextResponse.json(updatedBooking, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
