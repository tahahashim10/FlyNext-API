import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { isValidCardNumber, isValidExpiry } from '@/utils/validation';
import { verifyToken } from '@/utils/auth';

export async function POST(request) {

  // Verify token
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookingId, cardNumber, expiryMonth, expiryYear } = await request.json();

    // Check for required fields
    if (bookingId === undefined || !cardNumber || expiryMonth === undefined || expiryYear === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate bookingId is a number
    const parsedBookingId = Number(bookingId);
    if (isNaN(parsedBookingId)) {
      return NextResponse.json({ error: "bookingId must be a number" }, { status: 400 });
    }

    // Validate cardNumber is a non-empty string
    if (typeof cardNumber !== "string" || cardNumber.trim() === "") {
      return NextResponse.json({ error: "Invalid card number" }, { status: 400 });
    }

    // Validate expiryMonth is a number between 1 and 12
    if (typeof expiryMonth !== "number" || expiryMonth < 1 || expiryMonth > 12) {
      return NextResponse.json({ error: "Invalid expiry month" }, { status: 400 });
    }

    // Validate expiryYear is a number and (via isValidExpiry) in the future
    if (typeof expiryYear !== "number") {
      return NextResponse.json({ error: "expiryYear must be a number" }, { status: 400 });
    }
    if (!isValidExpiry(expiryMonth, expiryYear)) {
      return NextResponse.json({ error: "Expired card" }, { status: 400 });
    }

    // Validate card number and expiry date
    if (!isValidCardNumber(cardNumber)) {
      return NextResponse.json({ error: "Invalid credit card number" }, { status: 400 });
    }

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { user: true, hotel: true, room: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if the booking belongs to the authenticated user
    if (booking.userId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to checkout this booking" }, { status: 403 });
    }

    // Check if the booking is already confirmed to avoid double processing.
    if (booking.status === "CONFIRMED") {
      return NextResponse.json({ error: "Booking is already confirmed" }, { status: 400 });
    }

    // Mark the booking as confirmed
    const updatedBooking = await prisma.booking.update({
      where: { id: Number(bookingId) },
      data: { status: "CONFIRMED" },
    });

    // U22: Notify the user that their booking is now confirmed
    await prisma.notification.create({
      data: {
        userId: booking.userId,
        message: `Your booking at ${booking.hotel ? booking.hotel.name : 'your hotel'} has been confirmed.`,
      },
    });

    return NextResponse.json({
      message: "Booking confirmed",
      booking: updatedBooking,
    }, { status: 200 });
  } catch (error) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
