import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { verifyToken } from '@/utils/auth';


export async function GET(request) {

  // Verify the token and get the authenticated user's data
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {

    // Use the token's userId as the ownerId
    const ownerId = tokenData.userId;

    // Find all hotels owned by this user.
    const ownerHotels = await prisma.hotel.findMany({
      where: { ownerId: Number(ownerId) },
      select: { id: true },
    });
    const ownerHotelIds = ownerHotels.map((hotel) => hotel.id);

    // If no hotels are found, return an empty list.
    if (ownerHotelIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const { searchParams } = request.nextUrl;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const roomFilter = searchParams.get('room');

    // Validate date strings if provided
    let startDate, endDate;
    if (startDateStr) {
      startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
      }
    }
    if (endDateStr) {
      endDate = new Date(endDateStr);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
      }
    }

    // Optionally, check that startDate is before endDate if both are provided
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 });
    }

    // Validate roomFilter if provided
    let trimmedRoomFilter;
    if (roomFilter !== null) {
      if (typeof roomFilter !== "string") {
        return NextResponse.json({ error: "Invalid room filter" }, { status: 400 });
      }
      trimmedRoomFilter = roomFilter.trim();
    }    

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
    
    if (trimmedRoomFilter && trimmedRoomFilter.length > 0) {
      whereClause.room = { name: { contains: trimmedRoomFilter } };
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