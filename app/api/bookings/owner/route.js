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