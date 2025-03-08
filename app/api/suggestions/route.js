import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { getSuggestedHotels, getSuggestedFlights } from "@/utils/suggestions";
import { verifyToken } from "@/utils/auth";

export async function POST(request) {

  // Verify token to ensure the user is authenticated.
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { hotelId, destination, departureCity, suggestedDate } = await request.json();

    // At least one parameter is needed: destination for hotel suggestions, or hotelId for flight suggestions.
    if (!destination && !hotelId) {
      return NextResponse.json({ error: "Missing destination or hotelId" }, { status: 400 });
    }

    let suggestions = {};

    // If destination is provided, fetch hotel suggestions.
    if (destination) {
      if (typeof destination !== "string" || destination.trim() === "") {
        return NextResponse.json({ error: "destination must be a non-empty string." }, { status: 400 });
      }
      const hotels = await getSuggestedHotels(destination);
      suggestions.hotels = hotels;
      suggestions.searchUrl = `/search/hotels?city=${encodeURIComponent(destination)}&keepOrder=true`;
    }

    // If hotelId is provided, validate it is a number and exists
    if (hotelId) {
      const parsedHotelId = Number(hotelId);
      if (isNaN(parsedHotelId)) {
        return NextResponse.json({ error: "hotelId must be a number." }, { status: 400 });
      }
      const hotel = await prisma.hotel.findUnique({ where: { id: parsedHotelId } });
      if (!hotel) {
        return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
      }
      // Use the hotel's location for destination, if departureCity is provided, validate it is a non-empty string.
      let origin = "Toronto"; // default
      if (departureCity !== undefined) {
        if (typeof departureCity !== "string" || departureCity.trim() === "") {
          return NextResponse.json({ error: "departureCity must be a non-empty string if provided." }, { status: 400 });
        }
        origin = departureCity.trim();
      }
      // Optionally validate suggestedDate if provided (here we check if it's a valid date)
      if (suggestedDate) {
        const dateObj = new Date(suggestedDate);
        if (isNaN(dateObj.getTime())) {
          return NextResponse.json({ error: "suggestedDate must be a valid date string." }, { status: 400 });
        }
      }
      const flights = await getSuggestedFlights(hotel.location, origin, suggestedDate);
      suggestions.flights = flights;
      suggestions.searchUrl = `/search/flights?destination=${encodeURIComponent(hotel.location)}&keepOrder=true`;
    }

    return NextResponse.json(suggestions, { status: 200 });
  } catch (error) {
    console.error("Suggestions Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
