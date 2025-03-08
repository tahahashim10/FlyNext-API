import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { verifyToken } from "@/utils/auth";


/**
 * GET /api/hotels/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&roomId=number
 * Returns room availability details (per room type) for the specified date range.
 */
export async function GET(request) {

  // Verify that the request is authenticated.
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const roomIdParam = searchParams.get('roomId');

    // Ensure all required query parameters are provided
    if (!startDate || !endDate || !roomIdParam) {
      return NextResponse.json(
        { error: 'startDate, endDate, and roomId query parameters are required.' },
        { status: 400 }
      );
    }

    // Validate date formats
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Please use YYYY-MM-DD for startDate and endDate.' },
        { status: 400 }
      );
    }
    if (start >= end) {
      return NextResponse.json({ error: 'startDate must be before endDate.' }, { status: 400 });
    }

    // Validate roomId is a number
    const roomId = parseInt(roomIdParam, 10);
    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: 'Invalid roomId. It must be a number.' },
        { status: 400 }
      );
    }

    // Retrieve the room details using the provided roomId
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { hotel: true }
    });
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found.' },
        { status: 404 }
      );
    }

    // Ensure the authenticated user owns the hotel that this room belongs to.
    if (room.hotel.ownerId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You do not own this hotel." }, { status: 403 });
    }

    // Query bookings for the room that overlap with the given date range.
    // Overlap condition: booking checkIn is on or before the end date and booking checkOut is on or after the start date.
    const bookings = await prisma.booking.findMany({
      where: {
        roomId: roomId,
        status: { not: 'CANCELED' },
        checkIn: { lte: end },
        checkOut: { gte: start },
      },
    });

    // Calculate the number of rooms still available for the date range.
    // Assumption: each booking reserves one room.
    const availableRooms = room.availableRooms - bookings.length;

    // Return the room details and calculated availability
    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        totalRooms: room.availableRooms,
      },
      dateRange: { startDate, endDate },
      bookingsCount: bookings.length,
      availableRooms: availableRooms >= 0 ? availableRooms : 0,
    });
  } catch (error) {
    console.error('Error fetching room availability:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
