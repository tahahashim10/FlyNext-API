import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export async function PATCH(request) {
  try {
    const body = await request.json();

    // Option 1: Cancel a list of bookings
    if (body.bookingIds && Array.isArray(body.bookingIds)) {
      const bookingIds = body.bookingIds.map(Number);
      const updated = await prisma.booking.updateMany({
        where: { id: { in: bookingIds }, status: { not: 'CANCELED' } },
        data: { status: 'CANCELED' },
      });
      if (updated.count === 0) {
        return NextResponse.json({ message: "All specified bookings are already cancelled." }, { status: 200 });
      }
      return NextResponse.json(
        { message: 'Bookings cancelled', count: updated.count },
        { status: 200 }
      );
    }
    // Option 2: Cancel a single booking
    else if (body.bookingId) {
      const bookingId = Number(body.bookingId);
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });
      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      if (booking.status === 'CANCELED') {
        return NextResponse.json({ message: "Booking is already cancelled", booking }, { status: 200 });
      }
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELED' },
      });
      return NextResponse.json(
        { message: 'Booking cancelled', booking: updatedBooking },
        { status: 200 }
      );
    }
    // Option 3: Cancel all bookings for a given user
    else if (body.cancelAll && body.userId) {
      const userId = Number(body.userId);
      const updated = await prisma.booking.updateMany({
        where: { userId, status: { not: 'CANCELED' } },
        data: { status: 'CANCELED' },
      });
      if (updated.count === 0) {
        return NextResponse.json({ message: "No active bookings to cancel for this user." }, { status: 200 });
      }
      return NextResponse.json(
        { message: 'All bookings cancelled', count: updated.count },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid request body. Provide bookingId, bookingIds, or cancelAll with userId.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Cancel Bookings Error:", error.stack);
    // Prisma returns error code "P2025" when a record is not found during an update.
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
