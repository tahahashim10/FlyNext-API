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
