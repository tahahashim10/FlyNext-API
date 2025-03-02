import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clean up previous test data
  await prisma.booking.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.hotel.deleteMany({});
  await prisma.user.deleteMany({});

  // Create a hotel owner (needed for booking associations)
  const owner = await prisma.user.create({
    data: {
      firstName: "Booking",
      lastName: "Tester",
      email: "bookingtester@example.com",
      password: "hashedpassword", // In production, use a securely hashed password
      role: "HOTEL_OWNER",
    },
  });

  // Create a hotel record to which bookings will be linked
  const hotel = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: "Booking Test Hotel",
      logo: "https://example.com/hotel.png",
      address: "123 Booking Ave",
      location: "Booktown, BT",
      starRating: 4,
      images: ["https://example.com/hotel1.jpg"],
    },
  });

  // Create two rooms for the hotel
  const standardRoom = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      name: "Standard Room",
      amenities: ["WiFi", "TV"],
      pricePerNight: 100,
      images: ["https://example.com/standard.jpg"],
      availableRooms: 5,
    },
  });

  const deluxeRoom = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      name: "Deluxe Suite",
      amenities: ["WiFi", "TV", "Mini Bar"],
      pricePerNight: 150,
      images: ["https://example.com/deluxe.jpg"],
      availableRooms: 3,
    },
  });

  // Create bookings:
  // Booking 1: Standard Room, checkIn 2024-12-01, checkOut 2024-12-05
  const booking1 = await prisma.booking.create({
    data: {
      userId: owner.id,
      hotelId: hotel.id,
      roomId: standardRoom.id,
      checkIn: new Date("2024-12-01T00:00:00.000Z"),
      checkOut: new Date("2024-12-05T00:00:00.000Z"),
      status: "CONFIRMED",
    },
  });

  // Booking 2: Deluxe Suite, checkIn 2024-12-10, checkOut 2024-12-15
  const booking2 = await prisma.booking.create({
    data: {
      userId: owner.id,
      hotelId: hotel.id,
      roomId: deluxeRoom.id,
      checkIn: new Date("2024-12-10T00:00:00.000Z"),
      checkOut: new Date("2024-12-15T00:00:00.000Z"),
      status: "CONFIRMED",
    },
  });

  // Booking 3: Standard Room, checkIn 2024-12-20, checkOut 2024-12-25
  const booking3 = await prisma.booking.create({
    data: {
      userId: owner.id,
      hotelId: hotel.id,
      roomId: standardRoom.id,
      checkIn: new Date("2024-12-20T00:00:00.000Z"),
      checkOut: new Date("2024-12-25T00:00:00.000Z"),
      status: "CONFIRMED",
    },
  });

  console.log("Booking user story test: Bookings created successfully.");

  // Now perform filtering queries similar to U8:

  // 1. Filter by date range:
  //    Bookings with checkIn on/after 2024-12-06 and checkOut on/before 2024-12-19.
  const filterByDate = await prisma.booking.findMany({
    where: {
      hotelId: hotel.id,
      checkIn: { gte: new Date("2024-12-06T00:00:00.000Z") },
      checkOut: { lte: new Date("2024-12-19T00:00:00.000Z") },
    },
    include: { room: true, hotel: true },
  });
  console.log("Filtered by date range (2024-12-06 to 2024-12-19):");
  console.log(filterByDate);

  // 2. Filter by room type:
  //    Bookings for rooms whose name contains "Deluxe" (case-insensitive)
  const filterByRoomType = await prisma.booking.findMany({
    where: {
      hotelId: hotel.id,
      room: {
        isNot: null,
        name: { contains: "Deluxe", mode: "insensitive" },
      },
    },
    include: { room: true, hotel: true },
  });
  console.log("Filtered by room type 'Deluxe':");
  console.log(filterByRoomType);

  // 3. Combined filter: date range and room type "Standard"
  const combinedFilter = await prisma.booking.findMany({
    where: {
      hotelId: hotel.id,
      checkIn: { gte: new Date("2024-11-30T00:00:00.000Z") },
      checkOut: { lte: new Date("2024-12-06T00:00:00.000Z") },
      room: {
        isNot: null,
        name: { contains: "Standard", mode: "insensitive" },
      },
    },
    include: { room: true, hotel: true },
  });
  console.log("Filtered by date range and room type 'Standard':");
  console.log(combinedFilter);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
