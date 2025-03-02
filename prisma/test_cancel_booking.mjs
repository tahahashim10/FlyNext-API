import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Import the cancellation endpoint (U9)
// Adjust the path as needed based on your project structure.
import { POST as cancelBooking } from '../app/bookings/[id]/cancel/route.js';

// Helper: Create a fake Next.js Request with a URL and optional body.
function createFakeRequest(url, body = null) {
  return {
    nextUrl: new URL(url),
    json: async () => body,
  };
}

async function main() {
  // Clear previous test data.
  await prisma.booking.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.hotel.deleteMany({});
  await prisma.user.deleteMany({});

  // Create a hotel owner.
  const owner = await prisma.user.create({
    data: {
      firstName: "Cancel",
      lastName: "Tester",
      email: "canceltester@example.com",
      password: "hashedpassword", // Use a secure hash in production.
      role: "HOTEL_OWNER",
    },
  });

  // Create a hotel.
  const hotel = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: "Cancel Test Hotel",
      logo: "https://example.com/cancel-logo.png",
      address: "123 Cancel St",
      location: "Cancel City",
      starRating: 4,
      images: ["https://example.com/cancel1.jpg"],
    },
  });

  // Create a room for the hotel.
  const room = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      name: "Standard Room",
      amenities: ["WiFi", "TV"],
      pricePerNight: 100,
      images: ["https://example.com/standard.jpg"],
      availableRooms: 5,
    },
  });

  // Create a booking that we will cancel.
  const booking = await prisma.booking.create({
    data: {
      userId: owner.id,
      hotelId: hotel.id,
      roomId: room.id,
      checkIn: new Date("2024-12-01T00:00:00.000Z"),
      checkOut: new Date("2024-12-05T00:00:00.000Z"),
      status: "CONFIRMED",
    },
  });

  console.log("Before cancellation:");
  console.log(booking);

  // Simulate a cancellation request.
  const req = createFakeRequest(`http://localhost:3000/api/bookings/${booking.id}/cancel`);
  const res = await cancelBooking(req, { params: { id: booking.id.toString() } });
  const canceledBooking = await res.json();
  console.log("After cancellation:");
  console.log(canceledBooking);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
