import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.booking.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.hotel.deleteMany({});
  await prisma.user.deleteMany({});

  // Create a hotel owner for testing U11
  const owner = await prisma.user.create({
    data: {
      firstName: "U11",
      lastName: "Tester",
      email: "u11tester@example.com",
      password: "hashedpassword", // In production, use a securely hashed password!
      role: "HOTEL_OWNER",
    },
  });

  // Create a hotel to which rooms are linked
  const hotel = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: "U11 Test Hotel",
      logo: "https://example.com/u11logo.png",
      address: "123 U11 Ave",
      location: "Testville",
      starRating: 4,
      images: ["https://example.com/u11hotel1.jpg"],
    },
  });

  // Create a room with an initial capacity of 3 available rooms
  const room = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      name: "Test Room",
      amenities: ["WiFi", "TV"],
      pricePerNight: 120,
      images: ["https://example.com/room-u11.jpg"],
      availableRooms: 3,
    },
  });

  // Create three bookings for this room (all CONFIRMED)
  const booking1 = await prisma.booking.create({
    data: {
      userId: owner.id,
      hotelId: hotel.id,
      roomId: room.id,
      checkIn: new Date("2024-12-01T00:00:00.000Z"),
      checkOut: new Date("2024-12-05T00:00:00.000Z"),
      status: "CONFIRMED",
    },
  });
  const booking2 = await prisma.booking.create({
    data: {
      userId: owner.id,
      hotelId: hotel.id,
      roomId: room.id,
      checkIn: new Date("2024-12-10T00:00:00.000Z"),
      checkOut: new Date("2024-12-15T00:00:00.000Z"),
      status: "CONFIRMED",
    },
  });
  const booking3 = await prisma.booking.create({
    data: {
      userId: owner.id,
      hotelId: hotel.id,
      roomId: room.id,
      checkIn: new Date("2024-12-20T00:00:00.000Z"),
      checkOut: new Date("2024-12-25T00:00:00.000Z"),
      status: "CONFIRMED",
    },
  });

  console.log("U11 Seed Data created successfully");
  console.log("Room details:", room);
  console.log("Bookings created:", booking1, booking2, booking3);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
