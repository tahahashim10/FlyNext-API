import prisma from "@/utils/db";

export async function cancelBooking(bookingId) {
  return await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELED" },
  });
}