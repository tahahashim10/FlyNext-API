import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

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
    if (hotelId && roomId) {
      // Check if the hotel exists
      const hotelExists = await prisma.hotel.findUnique({
        where: { id: Number(hotelId) },
      });
      if (!hotelExists) {
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
    }

    return NextResponse.json({ hotelBooking, flightBooking }, { status: 201 });
  } catch (error) {
    console.error("Booking Error:", error);
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
