import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { geocodeAddress } from "@/utils/geocode";

export async function GET(request, { params }) {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: "Hotel ID required" }, { status: 400 });
    }

    try {
        const hotel = await prisma.hotel.findUnique({
            where: { id: Number(id) },
            include: { rooms: true }, // get all related room details for this hotel id
        });

        if (!hotel) {
        return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
        }

        let coordinates;
        try {
            coordinates = await geocodeAddress(`${hotel.address}, ${hotel.location}`);
        } catch (err) {
            console.error("Geocoding error:", err);
            coordinates = { lat: null, lng: null };
        }

        // build detailed hotel data object to return.
        const data = {
            id: hotel.id,
            name: hotel.name,
            logo: hotel.logo,
            address: hotel.address,
            location: hotel.location,
            starRating: hotel.starRating,
            images: hotel.images,
            coordinates,
            rooms: hotel.rooms.map((room) => ( // Note: each room id represents a distinct room type, and the availableRooms field indicates how many rooms of that type are available
                {
                    id: room.id,
                    type: room.name,
                    amenities: room.amenities,
                    pricePerNight: room.pricePerNight,
                    images: room.images,
                    availableRooms: room.availableRooms,
                }
            )),
        };

        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error("Error retrieving hotel details:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
