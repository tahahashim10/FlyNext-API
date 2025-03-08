import { NextResponse } from "next/server";
import prisma from '@/utils/db';
import { getUserBookings } from "@/utils/bookings";
import { verifyToken } from '@/utils/auth';

export async function GET(request) {
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const hotelBookings = await getUserBookings(tokenData.userId);
    const flightBookings = await prisma.flightBooking.findMany({
      where: { userId: tokenData.userId },
    });
    return NextResponse.json({ hotelBookings, flightBookings }, { status: 200 });
  } catch (error) {
    console.error("Fetch Bookings Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// for U20
export async function PATCH(request) {
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const hasSingleCancellation = body.bookingId !== undefined || body.bookingType !== undefined;
    const hasBulkCancellation = body.hotelBookingIds !== undefined || body.flightBookingIds !== undefined;
    const hasCancelAll = body.cancelAll !== undefined;

    if ((hasSingleCancellation && (hasBulkCancellation || hasCancelAll)) ||
        (hasBulkCancellation && (hasSingleCancellation || hasCancelAll)) ||
        (hasCancelAll && (hasSingleCancellation || hasBulkCancellation))) {
      return NextResponse.json(
        { error: "Please provide only one cancellation method: single cancellation (bookingId and bookingType), bulk cancellation (hotelBookingIds and/or flightBookingIds), or cancelAll." },
        { status: 400 }
      );
    }


    // Validate hotelBookingIds: must be an array of numbers.
    if (body.hotelBookingIds) {
      if (!Array.isArray(body.hotelBookingIds) || !body.hotelBookingIds.every(item => !isNaN(Number(item)))) {
        return NextResponse.json(
          { error: "hotelBookingIds must be an array of numbers." },
          { status: 400 }
        );
      }
    }

    // Validate flightBookingIds: must be an array of numbers.
    if (body.flightBookingIds) {
      if (!Array.isArray(body.flightBookingIds) || !body.flightBookingIds.every(item => !isNaN(Number(item)))) {
        return NextResponse.json(
          { error: "flightBookingIds must be an array of numbers." },
          { status: 400 }
        );
      }
    }


    // Handle cancelAll option
    if (body.cancelAll) {
      const hotelBookings = await prisma.booking.findMany({
        where: {
          userId: tokenData.userId,
          status: { not: 'CANCELED' },
        },
      });

      const flightBookings = await prisma.flightBooking.findMany({
        where: {
          userId: tokenData.userId,
          status: { not: 'CANCELED' },
        },
      });

      if (hotelBookings.length === 0 && flightBookings.length === 0) {
        return NextResponse.json(
          { message: "No active bookings found to cancel." },
          { status: 200 }
        );
      }

      const hotelUpdated = hotelBookings.length > 0
        ? await prisma.booking.updateMany({
            where: {
              id: { in: hotelBookings.map(b => b.id) },
              status: { not: 'CANCELED' },
            },
            data: { status: 'CANCELED' },
          })
        : { count: 0 };

      const flightUpdated = flightBookings.length > 0
        ? await prisma.flightBooking.updateMany({
            where: {
              id: { in: flightBookings.map(b => b.id) },
              status: { not: 'CANCELED' },
            },
            data: { status: 'CANCELED' },
          })
        : { count: 0 };

      const totalCanceled = hotelUpdated.count + flightUpdated.count;
      await prisma.notification.create({
        data: {
          userId: tokenData.userId,
          message: `All your active bookings have been canceled successfully.`,
        },
      });

      return NextResponse.json({ message: 'All bookings cancelled', count: totalCanceled }, { status: 200 });
    }

    // Bulk Cancellation: Expect separate arrays for hotel and flight booking IDs.
    if (body.hotelBookingIds || body.flightBookingIds) {
      const hotelBookingIds = body.hotelBookingIds && Array.isArray(body.hotelBookingIds)
        ? body.hotelBookingIds.map(Number)
        : [];
      const flightBookingIds = body.flightBookingIds && Array.isArray(body.flightBookingIds)
        ? body.flightBookingIds.map(Number)
        : [];

      const hotelBookings = hotelBookingIds.length > 0 
        ? await prisma.booking.findMany({
            where: {
              id: { in: hotelBookingIds },
              userId: tokenData.userId,
              status: { not: 'CANCELED' },
            },
          })
        : [];
      const flightBookings = flightBookingIds.length > 0 
        ? await prisma.flightBooking.findMany({
            where: {
              id: { in: flightBookingIds },
              userId: tokenData.userId,
              status: { not: 'CANCELED' },
            },
          })
        : [];

      if (hotelBookings.length === 0 && flightBookings.length === 0) {
        return NextResponse.json(
          { message: "No active bookings found in the provided lists, or they don't belong to you." },
          { status: 200 }
        );
      }

      const hotelUpdated = hotelBookings.length > 0
        ? await prisma.booking.updateMany({
            where: {
              id: { in: hotelBookings.map(b => b.id) },
              status: { not: 'CANCELED' },
            },
            data: { status: 'CANCELED' },
          })
        : { count: 0 };

      const flightUpdated = flightBookings.length > 0
        ? await prisma.flightBooking.updateMany({
            where: {
              id: { in: flightBookings.map(b => b.id) },
              status: { not: 'CANCELED' },
            },
            data: { status: 'CANCELED' },
          })
        : { count: 0 };

      const totalCanceled = hotelUpdated.count + flightUpdated.count;
      await prisma.notification.create({
        data: {
          userId: tokenData.userId,
          message: `Your selected bookings have been canceled successfully.`,
        },
      });
      return NextResponse.json({ message: 'Bookings cancelled', count: totalCanceled }, { status: 200 });
    }
    // Single Cancellation: Expect bookingId and bookingType.
    else if (body.bookingId && body.bookingType) {
      const bookingId = Number(body.bookingId);
      if (isNaN(bookingId)) {
        return NextResponse.json({ error: "bookingId must be a number." }, { status: 400 });
      }
      const bookingType = body.bookingType;
      if (!["hotel", "flight"].includes(bookingType)) {
        return NextResponse.json({ error: "bookingType must be either 'hotel' or 'flight'." }, { status: 400 });
      }
      
      let booking = null;
      if (bookingType === "hotel") {
        booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      } else {
        booking = await prisma.flightBooking.findUnique({ where: { id: bookingId } });
      }
      if (!booking) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }
      if (booking.userId !== tokenData.userId) {
        return NextResponse.json({ error: "Forbidden: You are not authorized to cancel this booking." }, { status: 403 });
      }
      if (booking.status === 'CANCELED') {
        return NextResponse.json({ message: "Booking is already cancelled.", booking }, { status: 200 });
      }
      if (bookingType === "hotel") {
        booking = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: "CANCELED" },
        });
      } else {
        booking = await prisma.flightBooking.update({
          where: { id: bookingId },
          data: { status: "CANCELED" },
        });
      }
      await prisma.notification.create({
        data: {
          userId: tokenData.userId,
          message: `Your booking has been canceled successfully.`,
        },
      });
      return NextResponse.json({ message: 'Booking cancelled', booking }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid request. For single cancellation, provide both bookingId and bookingType; for bulk cancellation, provide hotelBookingIds and/or flightBookingIds." }, { status: 400 });
    }
  } catch (error) {
    console.error("Cancel Bookings Error:", error.stack);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}


// for U15
export async function POST(request) {
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      hotelId,    // for hotel booking
      roomId,     // for hotel booking
      checkIn,    // for hotel booking
      checkOut,   // for hotel booking
      status,     // optional
      flightIds,  // for flight booking
      firstName,
      lastName,
      email,
      passportNumber
    } = await request.json();

    const userId = tokenData.userId;

    // Validate hotel booking inputs (if provided)
    if ((hotelId !== undefined || roomId !== undefined) && (hotelId === undefined || roomId === undefined)) {
      return NextResponse.json({ error: "Both hotelId and roomId must be provided for a hotel reservation." }, { status: 400 });
    }
    if (hotelId !== undefined && typeof hotelId !== "number") {
      return NextResponse.json({ error: "hotelId must be a number." }, { status: 400 });
    }
    if (roomId !== undefined && typeof roomId !== "number") {
      return NextResponse.json({ error: "roomId must be a number." }, { status: 400 });
    }
    if ((checkIn || checkOut) && (!checkIn || !checkOut)) {
      return NextResponse.json({ error: "Both checkIn and checkOut dates must be provided." }, { status: 400 });
    }
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return NextResponse.json({ error: "Invalid date format for checkIn or checkOut. Use YYYY-MM-DD." }, { status: 400 });
      }
      if (checkInDate >= checkOutDate) {
        return NextResponse.json({ error: "checkIn must be before checkOut." }, { status: 400 });
      }
    }

    // Validate flight booking inputs if flightIds provided
    if (flightIds !== undefined) {
      if (!Array.isArray(flightIds)) {
        return NextResponse.json({ error: "flightIds must be an array." }, { status: 400 });
      }
      if (flightIds.length > 0) {
        if (!firstName || typeof firstName !== "string" || firstName.trim() === "") {
          return NextResponse.json({ error: "firstName is required and must be a non-empty string for flight booking." }, { status: 400 });
        }
        if (!lastName || typeof lastName !== "string" || lastName.trim() === "") {
          return NextResponse.json({ error: "lastName is required and must be a non-empty string for flight booking." }, { status: 400 });
        }
        if (!email || typeof email !== "string" || email.trim() === "") {
          return NextResponse.json({ error: "email is required and must be a non-empty string for flight booking." }, { status: 400 });
        }
        if (!passportNumber || typeof passportNumber !== "string" || passportNumber.trim() === "") {
          return NextResponse.json({ error: "passportNumber is required and must be a non-empty string for flight booking." }, { status: 400 });
        }
        if (passportNumber.trim().length !== 9) {
          return NextResponse.json({ error: "passportNumber must be exactly 9 characters long." }, { status: 400 });
        }
      }
    }

    // Determine which booking types are requested
    const isHotelBookingRequested = hotelId && roomId;
    const isFlightBookingRequested = flightIds && Array.isArray(flightIds) && flightIds.length > 0;
    if (!isHotelBookingRequested && !isFlightBookingRequested) {
      return NextResponse.json({ error: "At least one booking type (hotel or flight) must be provided." }, { status: 400 });
    }

    let hotelBooking = null;
    if (isHotelBookingRequested) {
      const hotelRecord = await prisma.hotel.findUnique({ where: { id: hotelId } });
      if (!hotelRecord) {
        return NextResponse.json({ error: `Hotel with id ${hotelId} does not exist.` }, { status: 400 });
      }
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) {
        return NextResponse.json({ error: `Room with id ${roomId} does not exist.` }, { status: 400 });
      }
      if (checkIn && checkOut) {
        const overlappingBookings = await prisma.booking.findMany({
          where: {
            roomId: roomId,
            status: { not: 'CANCELED' },
            checkIn: { lt: new Date(checkOut) },
            checkOut: { gt: new Date(checkIn) },
          },
        });
        if (overlappingBookings.length >= room.availableRooms) {
          return NextResponse.json({ error: "No available rooms for the selected date range." }, { status: 400 });
        }
      }
      hotelBooking = await prisma.booking.create({
        data: {
          userId,
          hotelId,
          roomId,
          checkIn: checkIn ? new Date(checkIn) : null,
          checkOut: checkOut ? new Date(checkOut) : null,
          status: status || 'PENDING',
        },
      });
      await prisma.notification.create({
        data: {
          userId,
          message: `Your reservation at ${hotelRecord.name} (Room: ${room.name}) has been successfully created. Check-in: ${checkIn || "N/A"}, Check-out: ${checkOut || "N/A"}.`
        },
      });
      await prisma.notification.create({
        data: {
          userId: hotelRecord.ownerId,
          message: `A new booking has been made at your hotel ${hotelRecord.name}.`,
        },
      });
    }

    let flightBooking = null;
    if (isFlightBookingRequested) {
      // Call the AFS API to create the flight booking.
      let afsResponse;
      try {
        afsResponse = await callAfsBooking({
          firstName,
          lastName,
          email,
          passportNumber,
          flightIds,
        });
      } catch (error) {
        if (error.message.includes("No available seats")) {
          return NextResponse.json(
            { error: "Flight booking failed: No available seats on the selected flight." },
            { status: 400 }
          );
        }
        if (error.message.includes("AFS booking API error: 400") || error.message.includes("AFS booking API error: 404")) {
          return NextResponse.json(
            { error: "Flight booking failed due to invalid input." },
            { status: 400 }
          );
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
      }
      
      // Create a flight booking record in the FlightBooking table.
      flightBooking = await prisma.flightBooking.create({
        data: {
          userId,
          flightBookingReference: afsResponse.bookingReference,
          flightIds, // assuming JSON support; otherwise, store as a string.
          firstName,
          lastName,
          email,
          passportNumber,
          status: status || 'PENDING',
        },
      });
      await prisma.notification.create({
        data: {
          userId,
          message: `Your flight reservation (Reference: ${afsResponse.bookingReference}) is currently pending. Complete the payment process to secure your seat(s).`
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

