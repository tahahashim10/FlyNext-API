import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { getSearchParams } from "@/utils/query";
import { geocodeAddress } from "@/utils/geocode";
import { verifyToken } from "@/utils/auth";

// don't add verification token since this user story is for visitors (U12)
export async function GET(request) {
    const { checkIn, checkOut, city, name, starRating, minPrice, maxPrice } = getSearchParams(request);

    if (!checkIn || !checkOut || !city) {
        return NextResponse.json({ error: "checkIn, checkOut, and city are required" }, { status: 400 });
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
    }
    if (checkInDate >= checkOutDate) {
        return NextResponse.json({ error: "Invalid check-in/check-out dates" }, { status: 400 });
    }

    if (typeof city !== "string" || city.trim() === "") {
        return NextResponse.json({ error: "City must be a non-empty string." }, { status: 400 });
    }
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
        return NextResponse.json({ error: "Name must be a non-empty string if provided." }, { status: 400 });
    }

    if (starRating !== undefined && isNaN(Number(starRating))) {
        return NextResponse.json({ error: "starRating must be a valid number." }, { status: 400 });
    }
    if (minPrice !== undefined && isNaN(Number(minPrice))) {
        return NextResponse.json({ error: "minPrice must be a valid number." }, { status: 400 });
    }
    if (maxPrice !== undefined && isNaN(Number(maxPrice))) {
        return NextResponse.json({ error: "maxPrice must be a valid number." }, { status: 400 });
    }
  

    // From Exercise 4
    // We build whereClause conditionally so only provided parameters become filters
    // This way, missing parameters do not restrict the query
    const whereClause = {};
    if (city) whereClause.location = { contains: city }; 
    if (name) whereClause.name = { contains: name };
    if (starRating) whereClause.starRating = Number(starRating);

    try {
        let hotels;
        // making sure to find hotels with availableRooms > 0
        if(minPrice && maxPrice) {
            hotels = await prisma.hotel.findMany({
                where: whereClause,
                include: {
                    rooms: {
                        where: { 
                            availableRooms: { gt: 0 }, // gt: 0 => greater than 0
                            pricePerNight: { gte: Number(minPrice), lte: Number(maxPrice) }, // gte is >=, lte is <=
                            bookings: { // only include rooms that don't have overlapping bookings
                                none: {
                                    checkIn: { lt: checkOutDate },
                                    checkOut: { gt: checkInDate },
                                }
                            }
                        }, 
                        orderBy: { pricePerNight: "asc" }, // need to order by b/c we need "starting price" later
                    },
                },
            });
        } else {
            hotels = await prisma.hotel.findMany({
                where: whereClause,
                include: {
                    rooms: {
                        where: { 
                            availableRooms: { gt: 0 },
                            bookings: { // only include rooms that don't have overlapping bookings
                                none: {
                                    checkIn: { lt: checkOutDate },
                                    checkOut: { gt: checkInDate },
                                }
                            } 
                        
                        }, // gt: 0 => greater than 0
                        orderBy: { pricePerNight: "asc" }, // need to order by b/c we need "starting price" later
                    },
                },
            });
        }

        // remove hotels that have no rooms available based on the filtering
        hotels = hotels.filter((hotel) => hotel.rooms.length > 0);

        

        // calculate starting price for each room if available
        const results = await Promise.all( // if we use async callback in Array.map we need to wrap it with Promise.all so that all promises resolve before returning results
            hotels.map(async (hotel) => {
                let startingPrice = null;
                if (hotel.rooms.length > 0) {
                    startingPrice = hotel.rooms[0].pricePerNight; // since we ordered by pricePerNight, hotel.rooms[0] will be lowest price
                }

                let coordinates;
                try {
                    coordinates = await geocodeAddress(`${hotel.address}, ${hotel.location}`);
                } catch (err) {
                    console.error("Geocoding error:", err);
                    coordinates = { lat: null, lng: null };
                }

                return {
                    id: hotel.id,
                    name: hotel.name,
                    logo: hotel.logo,
                    address: hotel.address,
                    location: hotel.location,
                    starRating: hotel.starRating,
                    startingPrice,
                    coordinates  // need to use geocoding API
                };
            })
        );

        return NextResponse.json({ results }, { status: 200 });

    } catch (error) {
        console.error("Error retrieving hotels:", error.stack);
        // return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });

        return NextResponse.json({ error: "Internal Server Error", details: "An error occurred" }, { status: 500 });
    }
}

export async function POST(request) {

    // Verify that the user is authenticated
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, logo, address, location, starRating, images } = await request.json();

    // Validate required fields
    if (typeof name !== 'string' || name.trim() === "") {
        return NextResponse.json({ error: "Hotel name must be a non-empty string." }, { status: 400 });
    }
    if (typeof address !== 'string' || address.trim() === "") {
        return NextResponse.json({ error: "Address must be a non-empty string." }, { status: 400 });
    }
    if (typeof location !== 'string' || location.trim() === "") {
        return NextResponse.json({ error: "Location must be a non-empty string." }, { status: 400 });
    }
    if (starRating === undefined || isNaN(Number(starRating))) {
        return NextResponse.json({ error: "Star rating must be a valid number." }, { status: 400 });
    }

    // check if optional parameters are provided, if they are then validate those too
    if (logo && !isValidUrl(logo)) {
        return NextResponse.json({ error: "Logo must be a valid URL." }, { status: 400 });
    }
    if (images && Array.isArray(images)) {
        for (const img of images) {
            if (!isValidUrl(img)) {
                return NextResponse.json({ error: "All images must be valid URLs." }, { status: 400 });
            }
        }
    } else if (images) {
        return NextResponse.json({ error: "Images must be provided as an array." }, { status: 400 });
    }

    // The authenticated user will become the owner of the hotel
    const ownerId = tokenData.userId;

    // Create a new hotel, connecting the hotel with an existing owner using ownerId
    const hotel = await prisma.hotel.create({
      data: {
        name,
        logo,
        address,
        location,
        starRating,
        images,
        owner: {
          connect: { id: ownerId },
        },
      },
    });

    return NextResponse.json(hotel, { status: 201 });
  } catch (error) {
    console.error('Error creating hotel:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// source: https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
function isValidUrl(string) {
    const urlRegex = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
    return urlRegex.test(string);
}
  