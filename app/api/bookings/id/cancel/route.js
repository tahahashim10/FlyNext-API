// app/bookings/[id]/cancel/route.js
import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(request, { params }) {
  try {
    const { id } = params;
    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
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
