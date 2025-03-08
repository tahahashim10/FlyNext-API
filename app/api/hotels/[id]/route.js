import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { geocodeAddress } from "@/utils/geocode";
import { verifyToken } from '@/utils/auth';

// don't add verification token because this user story is for visitors (U13)
export async function GET(request, { params }) {
    const { id } = await params;
    // Validate that an id is provided and that it is a valid number
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Valid Hotel ID is required" }, { status: 400 });
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

  // Verify the token first
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const { name, logo, address, location, starRating, images } = await request.json();

    // Validate required fields (if provided)
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return NextResponse.json({ error: "Hotel name must be a non-empty string." }, { status: 400 });
    }
    if (address !== undefined && (typeof address !== "string" || address.trim() === "")) {
      return NextResponse.json({ error: "Address must be a non-empty string." }, { status: 400 });
    }
    if (location !== undefined && (typeof location !== "string" || location.trim() === "")) {
      return NextResponse.json({ error: "Location must be a non-empty string." }, { status: 400 });
    }
    if (starRating !== undefined && (isNaN(Number(starRating)) || Number(starRating) < 0)) {
      return NextResponse.json({ error: "Star rating must be a valid non-negative number." }, { status: 400 });
    }
    if (logo !== undefined && logo !== "" && !isValidUrl(logo)) {
      return NextResponse.json({ error: "Logo must be a valid URL." }, { status: 400 });
    }
    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return NextResponse.json({ error: "Images must be provided as an array." }, { status: 400 });
      }
      for (const img of images) {
        if (typeof img !== "string" || !isValidUrl(img)) {
          return NextResponse.json({ error: "Each image must be a valid URL." }, { status: 400 });
        }
      }
    }

    // Verify hotel exists
    const existingHotel = await prisma.hotel.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingHotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    // Ensure that the authenticated user owns this hotel
    if (existingHotel.ownerId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You do not own this hotel." }, { status: 403 });
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
  
  // Verify the token first
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const idNumber = Number(id);
    if (isNaN(idNumber)) {
      return NextResponse.json({ error: "Invalid hotel id. Must be a number." }, { status: 400 });
    }

    // Verify hotel exists
    const existingHotel = await prisma.hotel.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingHotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    // Ensure that the authenticated user owns this hotel
    if (existingHotel.ownerId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You do not own this hotel." }, { status: 403 });
    }

    await prisma.hotel.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Hotel deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// source: https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
function isValidUrl(string) {
  const urlRegex = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
  return urlRegex.test(string);
}