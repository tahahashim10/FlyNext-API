import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clear previous test data
  await prisma.booking.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.hotel.deleteMany({});
  await prisma.user.deleteMany({});

  // Create a hotel owner (needed for room and booking associations)
  const owner = await prisma.user.create({
    data: {
      firstName: "Availability",
      lastName: "Tester",
      email: "availtester@example.com",
      password: "hashedpassword", // In production, use a securely hashed password
      role: "HOTEL_OWNER",
    },
  });

  // Create a hotel record to which rooms will be linked
  const hotel = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: "Availability Test Hotel",
      logo: "https://example.com/avail-logo.png",
      address: "123 Avail St",
      location: "Avail City",
      starRating: 5,
      images: ["https://example.com/avail1.jpg"],
    },
  });

  // Create a room for the hotel
  const room = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      name: "Standard Room",
      amenities: ["WiFi", "TV"],
      pricePerNight: 100,
      images: ["https://example.com/room1.jpg"],
      availableRooms: 5,
    },
  });

  // Create bookings that overlap a given date range:
  // Booking 1: checkIn 2024-12-10, checkOut 2024-12-15
  const booking1 = await prisma.booking.create({
    data: {
      userId: owner.id,
      hotelId: hotel.id,
      roomId: room.id,
      checkIn: new Date("2024-12-10T00:00:00.000Z"),
      checkOut: new Date("2024-12-15T00:00:00.000Z"),
      status: "CONFIRMED",
    },
  });

  // Booking 2: checkIn 2024-12-12, checkOut 2024-12-18
  const booking2 = await prisma.booking.create({
    data: {
      userId: owner.id,
      hotelId: hotel.id,
      roomId: room.id,
      checkIn: new Date("2024-12-12T00:00:00.000Z"),
      checkOut: new Date("2024-12-18T00:00:00.000Z"),
      status: "CONFIRMED",
    },
  });

  console.log("U10 Seed Data created successfully:");
  console.log("Hotel:", hotel);
  console.log("Room:", room);
  console.log("Booking 1:", booking1);
  console.log("Booking 2:", booking2);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
