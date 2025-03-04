import prisma from "@/utils/db";

export async function getBookingDetails(bookingId) {
  return await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      hotel: true,
      room: true,
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });
}