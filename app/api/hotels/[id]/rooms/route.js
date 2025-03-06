import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { getSearchParams } from "@/utils/query";

// don't add verification token because this user story is for visitors (U14)
export async function GET(request, { params }) {
    const { id } = await params; 
    if (!id) {
        return NextResponse.json({ error: "Hotel ID required" }, { status: 400 });
    }

    const { checkIn, checkOut } = getSearchParams(request);

    if (!checkIn || !checkOut) {
        return NextResponse.json({ error: "checkIn and checkOut dates required" }, { status: 400 });
    }

    if (new Date(checkIn) >= new Date(checkOut)) {
        return NextResponse.json({ error: "Invalid checkIn/checkOut dates" }, { status: 400 });
    }
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    try {
        // find room types for the given hotel id
        const rooms = await prisma.room.findMany({
            where: { hotelId: Number(id) },
            include: {
                bookings: {
                    where: { // include overlapping rooms too so that that we can subtract that count from total # available rooms to find actual availability
                        // even if a room type is partially booked we can still show that some rooms remain available (we do this part after)
                        checkIn: { lt: checkOutDate },
                        checkOut: { gt: checkInDate },
                    },
                },
            },
        });

        // calculate availability for each room type
        // availability = availableRooms - # overlapping bookings (calculated above in include bookings where clause)
        const results = rooms.map((room) => {
            const bookedCount = room.bookings.length; // calculated above in include bookings where clause for 
            const remainingRooms = room.availableRooms - bookedCount;

            return {
                id: room.id,
                name: room.name,
                amenities: room.amenities,
                pricePerNight: room.pricePerNight,
                images: room.images,
                totalAvailableRooms: room.availableRooms,
                remainingRooms,
            };
        });

        return NextResponse.json({ results }, { status: 200 });
    } catch (error) {
        console.error("Error retrieving room availability:", error);
        return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
        );
    }
}
