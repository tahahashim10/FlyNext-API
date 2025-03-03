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
    take: 5, // Return top 5 suggestions
  });
}

export async function getSuggestedFlights(city) {
  return await prisma.flight.findMany({
    where: { destination: city },
    select: {
      id: true,
      airline: true,
      departureTime: true,
      price: true,
    },
    take: 5, // Return top 5 suggestions
  });
}