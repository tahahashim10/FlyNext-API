import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { getSuggestedHotels, getSuggestedFlights } from "@/utils/suggestions";

export async function POST(request) {
  try {
    const { flightId, hotelId } = await request.json();

    if (!flightId && !hotelId) {
      return NextResponse.json({ error: "Missing flightId or hotelId" }, { status: 400 });
    }

    let suggestions = {};

    if (flightId) {
      // Fetch flight details and get hotel suggestions
      const flight = await prisma.flight.findUnique({ where: { id: flightId } });
      if (!flight) return NextResponse.json({ error: "Flight not found" }, { status: 404 });

      const hotels = await getSuggestedHotels(flight.destination);
      suggestions.hotels = hotels;
      suggestions.searchUrl = `/search/hotels?city=${encodeURIComponent(flight.destination)}&keepOrder=true`;
    }

    if (hotelId) {
      // Fetch hotel details and get flight suggestions
      const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
      if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });

      const flights = await getSuggestedFlights(hotel.location);
      suggestions.flights = flights;
      suggestions.searchUrl = `/search/flights?destination=${encodeURIComponent(hotel.location)}&keepOrder=true`;
    }

    return NextResponse.json(suggestions, { status: 200 });
  } catch (error) {
    console.error("Suggestions Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
