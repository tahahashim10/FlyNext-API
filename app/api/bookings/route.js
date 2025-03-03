// app/api/bookings/route.js
import { NextResponse } from 'next/server';
import { prisma } from "@/utils/db";

export async function POST(request) {
  // const session = await getSession({ req });

//   if (!session) {
//     return res.status(401).json({ message: 'Unauthorized' });
//   }

  const { userId, hotelId, roomId, checkIn, checkOut, status } = await request.json();

  try {
    const createdBooking = await prisma.booking.create({
      data: {
        userId,
        hotelId,  
        roomId,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || 'CONFIRMED',
      },
    });

    // Return the created user (excluding the password)
    return NextResponse.json(
        {
            booking: {
                id: createdBooking.id,
                userId: createdBooking.userId,
                hotelId: createdBooking.hotelId,
                roomId: createdBooking.roomId,
                checkIn: createdBooking.checkIn,
                checkOut: createdBooking.checkOut,
                status: createdBooking.status
            },
        },
        { status: 201 }
    );

  } catch (error) {
        console.error("Booking Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}