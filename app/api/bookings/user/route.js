import { NextResponse } from "next/server";
import prisma from '@/utils/db';
import { getUserBookings } from "@/utils/bookings";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const bookings = await getUserBookings(parseInt(userId));

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error("Fetch Bookings Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
      // Get one booking to determine the userId (assuming all belong to the same user)
      const bookingSample = await prisma.booking.findUnique({ where: { id: bookingIds[0] } });
      await prisma.notification.create({
        data: {
          userId: bookingSample.userId,
          message: `Your selected bookings have been canceled successfully.`,
        },
      });
      return NextResponse.json({ message: 'Bookings cancelled', count: updated.count }, { status: 200 });
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
      // U22: Notify the user about the cancellation
      await prisma.notification.create({
        data: {
          userId: updatedBooking.userId,
          message: `Your booking has been canceled successfully.`,
        },
      });
      return NextResponse.json({ message: 'Booking cancelled', booking: updatedBooking }, { status: 200 });
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
      await prisma.notification.create({
        data: {
          userId: userId,
          message: `All your active bookings have been canceled successfully.`,
        },
      });
      return NextResponse.json({ message: 'All bookings cancelled', count: updated.count }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid request body. Provide bookingId, bookingIds, or cancelAll with userId.' }, { status: 400 });
    }
  } catch (error) {
    console.error("Cancel Bookings Error:", error.stack);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// for U15
// for U15
export async function POST(request) {
  try {
    const {
      userId,
      hotelId,    // Optional: for hotel reservation
      roomId,     // Optional: for hotel reservation
      checkIn,    // Optional: for hotel reservation
      checkOut,   // Optional: for hotel reservation
      status,     // Defaults to CONFIRMED if not provided
      flightIds,  // Optional: array of flight IDs for booking flights
      // Flight passenger details required if flightIds provided:
      firstName,
      lastName,
      email,
      passportNumber
    } = await request.json();

    // Validate required field(s)
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });
    if (!user) {
      return NextResponse.json({ error: `User with id ${userId} does not exist.` }, { status: 404 });
    }

    let hotelBooking = null;
    let hotelRecord = null; // We'll use this to access hotel details for the notification.
    if (hotelId && roomId) {
      // Check if the hotel exists
      hotelRecord = await prisma.hotel.findUnique({
        where: { id: Number(hotelId) },
      });
      if (!hotelRecord) {
        return NextResponse.json(
          { error: `Hotel with id ${hotelId} does not exist.` },
          { status: 400 }
        );
      }
      // Check if the room exists and get its total capacity
      const room = await prisma.room.findUnique({
        where: { id: Number(roomId) },
      });
      if (!room) {
        return NextResponse.json(
          { error: `Room with id ${roomId} does not exist.` },
          { status: 400 }
        );
      }
      
      // Validate date range if provided
      if (checkIn && checkOut) {
        // Calculate overlapping bookings for this room in the given date range.
        // A booking overlaps if its checkIn is before the new booking's checkOut and its checkOut is after the new booking's checkIn.
        const overlappingBookings = await prisma.booking.findMany({
          where: {
            roomId: Number(roomId),
            status: { not: 'CANCELED' },
            checkIn: { lt: new Date(checkOut) },
            checkOut: { gt: new Date(checkIn) },
          },
        });

        if (overlappingBookings.length >= room.availableRooms) {
          return NextResponse.json(
            { error: "No available rooms for the selected date range." },
            { status: 400 }
          );
        }
      }
      
      // Create the booking with a PENDING status
      hotelBooking = await prisma.booking.create({
        data: {
          userId: Number(userId),
          hotelId: Number(hotelId),
          roomId: Number(roomId),
          checkIn: checkIn ? new Date(checkIn) : null,
          checkOut: checkOut ? new Date(checkOut) : null,
          status: status || 'PENDING',
        },
      });

      // U22: Add notifications 
      // Notify the user about their booking creation.
      await prisma.notification.create({
        data: {
          userId: Number(userId),
          message: `Your booking at ${hotelRecord.name} has been created. Check-in: ${checkIn || "N/A"}, Check-out: ${checkOut || "N/A"}.`,
        },
      });
      // Notify the hotel owner about the new booking.
      await prisma.notification.create({
        data: {
          userId: hotelRecord.ownerId,
          message: `A new booking has been made at your hotel ${hotelRecord.name}.`,
        },
      });
    }

    let flightBooking = null;
    if (flightIds && Array.isArray(flightIds) && flightIds.length > 0) {
      // Validate flight passenger details
      if (!firstName || !lastName || !email || !passportNumber) {
        return NextResponse.json(
          { error: "Flight booking requires passenger details (firstName, lastName, email, passportNumber)" },
          { status: 400 }
        );
      }
      flightBooking = await callAfsBooking({
        firstName,
        lastName,
        email,
        passportNumber,
        flightIds,
      });

      // Add a notification for the flight booking.
      await prisma.notification.create({
        data: {
          userId: Number(userId),
          message: `Your flight booking has been confirmed.`,
        },
      });
    }

    return NextResponse.json({ hotelBooking, flightBooking }, { status: 201 });
  } catch (error) {
    console.error("Booking Error:", error.stack);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

async function callAfsBooking(payload) {
  const baseUrl = process.env.AFS_BASE_URL;
  const apiKey = process.env.AFS_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("AFS API configuration is missing");
  }
  const url = new URL("/api/bookings", baseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AFS booking API error: ${res.status} - ${errorText}`);
  }
  return res.json();
}

