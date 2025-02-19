import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { getSearchParams } from "@/utils/query";

export async function GET(request) {
    const { checkIn, checkOut, city, name, starRating, minPrice, maxPrice } = getSearchParams(request);

    if (!checkIn || !checkOut || !city) {
        return NextResponse.json({ error: "checkIn, checkOut, and city are required" }, { status: 400 });
    }

    // From Exercise 4
    // We build whereClause conditionally so only provided parameters become filters
    // This way, missing parameters do not restrict the query
    const whereClause = {};
    if (city) whereClause.location = { contains: city, mode: "insensitive" };
    if (name) whereClause.name = { contains: name, mode: "insensitive" };
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
                            availableRooms: { gt: 0 }, // gt: 0 => greater than 0
                        }, 
                        orderBy: { pricePerNight: "asc" }, // need to order by b/c we need "starting price" later
                    },
                },
            });
        }
        

        // calculate starting price for each room if available
        const results = hotels.map((hotel) => {
            let startingPrice = null;
            if (hotel.rooms.length > 0) {
                startingPrice = hotel.rooms[0].pricePerNight; // since we ordered by pricePerNight, hotel.rooms[0] will be lowest price
            }

            return {
                id: hotel.id,
                name: hotel.name,
                logo: hotel.logo,
                address: hotel.address,
                location: hotel.location,
                starRating: hotel.starRating,
                startingPrice,
                coordinates: { lat: null, lng: null } // placeholder for now, need to use geocoding API
            };
        });

        return NextResponse.json({ results }, { status: 200 });

    } catch (error) {
        console.error("Error retrieving hotels:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
