import { NextResponse } from 'next/server';
import prisma from '@/utils/db';


export async function GET(request) {
  try {

    const { searchParams } = request.nextUrl;
    const ownerId = searchParams.get('ownerId');
    if (!ownerId) {
      return NextResponse.json({ error: "ownerId query parameter is required" }, { status: 400 });
    }

    // Check if the owner exists and has the HOTEL_OWNER role
    const ownerUser = await prisma.user.findUnique({
      where: { id: Number(ownerId) },
    });
    if (!ownerUser) {
      return NextResponse.json({ error: `Owner with id ${ownerId} does not exist.` }, { status: 400 });
    }
    if (ownerUser.role !== 'HOTEL_OWNER') {
      return NextResponse.json({ error: `User with id ${ownerId} is not a hotel owner.` }, { status: 400 });
    }

    // Find all hotels owned by this user.
    const ownerHotels = await prisma.hotel.findMany({
      where: { ownerId: Number(ownerId) },
      select: { id: true },
    });
    const ownerHotelIds = ownerHotels.map((hotel) => hotel.id);

    // If no hotels found, return an empty list.
    if (ownerHotelIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const startDate = searchParams.get('startDate'); 
    const endDate = searchParams.get('endDate');       
    const roomFilter = searchParams.get('room');       

    // Build filtering conditions for bookings.
    const whereClause = {
      hotelId: { in: ownerHotelIds },
    }
    if (startDate) {
      whereClause.checkOut = { gte: new Date(startDate) };
    }
    if (endDate) {
      whereClause.checkIn = { lte: new Date(endDate) };
    }
    
    if (roomFilter) {
      whereClause.room = {
        name: {
          contains: roomFilter
        }
      };
    }  

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        room: true,
        hotel: true,
      },
    });

    return NextResponse.json(bookings, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
      // Check if the room exists
      const roomExists = await prisma.room.findUnique({
        where: { id: Number(roomId) },
      });
      if (!roomExists) {
        return NextResponse.json(
          { error: `Room with id ${roomId} does not exist.` },
          { status: 400 }
        );
      }

      hotelBooking = await prisma.booking.create({
        data: {
          userId: Number(userId),
          hotelId: Number(hotelId),
          roomId: Number(roomId),
          checkIn: checkIn ? new Date(checkIn) : null,
          checkOut: checkOut ? new Date(checkOut) : null,
          status: status || 'CONFIRMED',
        },
      });

      // U22: Add notifications 
      // Notify the user about their booking confirmation.
      await prisma.notification.create({
        data: {
          userId: Number(userId),
          message: `Your booking at ${hotelRecord.name} has been confirmed. Check-in: ${checkIn || "N/A"}, Check-out: ${checkOut || "N/A"}.`,
        },
      });
      // Notify the hotel owner about the new booking.
      await prisma.notification.create({
        data: {
          userId: hotelRecord.ownerId,
          message: `A new booking has been made at your hotel ${hotelRecord.name}.`,
        },
      });
      // 
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
