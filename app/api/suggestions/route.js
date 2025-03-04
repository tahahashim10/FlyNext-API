import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { getSuggestedHotels, getSuggestedFlights } from "@/utils/suggestions";

export async function POST(request) {
  try {
    const { flightId, hotelId, destination, departureCity, suggestedDate } = await request.json();

    if (!flightId && !hotelId) {
      return NextResponse.json({ error: "Missing flightId or hotelId" }, { status: 400 });
    }

    let suggestions = {};

    if (flightId) {
      if (!destination) {
        return NextResponse.json(
          { error: "For flight-based suggestions, please provide destination." },
          { status: 400 }
        );
      }
      const hotels = await getSuggestedHotels(destination);
      suggestions.hotels = hotels;
      suggestions.searchUrl = `/search/hotels?city=${encodeURIComponent(destination)}&keepOrder=true`;
    }

    if (hotelId) {
      const hotel = await prisma.hotel.findUnique({ where: { id: Number(hotelId) } });
      if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });

      // Use the hotel's location for destination.
      // Use the provided departureCity if given, otherwise default to "Toronto".
      const origin = departureCity || "Toronto";
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
