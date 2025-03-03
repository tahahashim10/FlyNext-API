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

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { name, logo, address, location, starRating, images } = await request.json();

    // Verify hotel exists
    const existingHotel = await prisma.hotel.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingHotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    // Update only fields that are provided
    const updatedHotel = await prisma.hotel.update({
      where: { id: parseInt(id) },
      data: {
        name: name !== undefined ? name : existingHotel.name,
        logo: logo !== undefined ? logo : existingHotel.logo,
        address: address !== undefined ? address : existingHotel.address,
        location: location !== undefined ? location : existingHotel.location,
        starRating: starRating !== undefined ? starRating : existingHotel.starRating,
        images: images !== undefined ? images : existingHotel.images,
      },
    });

    return NextResponse.json(updatedHotel, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // Verify hotel exists
    const existingHotel = await prisma.hotel.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingHotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    await prisma.hotel.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Hotel deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
