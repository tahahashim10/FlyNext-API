import prisma from "@/utils/db";

export async function getBookingDetails(bookingId, bookingType) {
  if (bookingType === "hotel") {
    return await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: {
        hotel: true,
        room: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  } else if (bookingType === "flight") {
    return await prisma.flightBooking.findUnique({
      where: { id: Number(bookingId) },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  } else {
    throw new Error("Invalid bookingType provided. It must be 'hotel' or 'flight'.");
  }
}
