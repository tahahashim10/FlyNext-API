// app/bookings/[id]/cancel/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/utils/db';

export async function POST(request, { params }) {
  try {
    const { id } = params;

    // get the ownerId from the query parameters for now -
    // TODO: change to call verifyToken and then verify id
    const { searchParams } = request.nextUrl;
    const ownerIdParam = searchParams.get('ownerId');
    if (!ownerIdParam) {
      return NextResponse.json({ error: "ownerId query parameter is required" }, { status: 400 });
    }
    const ownerIdNum = Number(ownerIdParam);
    if (isNaN(ownerIdNum)) {
      return NextResponse.json({ error: "Invalid ownerId value" }, { status: 400 });
    }

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // check that the booking's hotel belongs to the provided owner.
    if (!booking.hotel || booking.hotel.ownerId !== ownerIdNum) {
      return NextResponse.json({ error: "Forbidden: This booking does not belong to your hotel" }, { status: 403 });
    }
    // Update status to "CANCELED"
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELED' },
    });
    return NextResponse.json(updatedBooking, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
