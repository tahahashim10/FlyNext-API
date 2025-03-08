import prisma from "@/utils/db";

export async function getSuggestedHotels(city) {
  return await prisma.hotel.findMany({
    where: { location: city },
    select: {
      id: true,
      name: true,
      starRating: true,
      address: true,
      images: true,
    },
    take: 5,
  });
}

//accepts an optional suggestedDate parameter.
export async function getSuggestedFlights(destinationCity, departureCity = "Toronto", suggestedDate) { // * note: default departureCity is Toronto
  const baseUrl = process.env.AFS_BASE_URL;
  const apiKey = process.env.AFS_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("AFS API configuration is missing");
  }
  
  // Use the provided suggestedDate, or default to tomorrow's date.
  let date = suggestedDate;
  if (!date) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    date = tomorrow.toISOString().split("T")[0];
  }
  
  const url = new URL("/api/flights", baseUrl);
  url.search = new URLSearchParams({
    origin: departureCity,
    destination: destinationCity,
    date: date,
  }).toString();

  try {
    const res = await fetch(url.toString(), {
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) {
      console.error(`AFS flight search error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    let flights = [];
    if (data.results && Array.isArray(data.results)) {
      flights = data.results.flatMap(group => group.flights);
    }
    return flights.slice(0, 5).map(flight => ({
      id: flight.id,
      airline: flight.airline,
      departureTime: flight.departureTime,
      price: flight.price,
    }));
  } catch (error) {
    console.error("Error in getSuggestedFlights:", error);
    return [];
  }
}
