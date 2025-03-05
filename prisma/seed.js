import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data in correct order due to foreign key constraints
  await prisma.booking.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.hotel.deleteMany({});
  await prisma.user.deleteMany({});

  // Hash the password (using "password123" as an example)
  const plainPassword = "password123";
  const hashedPassword = bcrypt.hashSync(plainPassword, 10);

  // Create a hotel owner with the hashed password
  const owner = await prisma.user.create({
    data: {
      firstName: "Alice",
      lastName: "Owner",
      email: "alice@example.com",
      password: hashedPassword,
      role: "HOTEL_OWNER",
    },
  });

  // Create a hotel with a valid address
  const hotel = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: "Test Hotel One",
      logo: "https://example.com/logo1.png",
      address: "1600 Amphitheatre Parkway",
      location: "Mountain View, CA",
      starRating: 4,
      images: JSON.stringify([
        "https://example.com/hotel1-1.jpg",
        "https://example.com/hotel1-2.jpg",
      ]),
    },
  });

  // Create two rooms for the hotel

  // Room 1: This room will have a booking overlapping the search period.
  const room1 = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      name: "Standard Room",
      amenities: JSON.stringify(["WiFi", "Air Conditioning", "TV"]),
      pricePerNight: 100,
      images: JSON.stringify(["https://example.com/room1.jpg"]),
      availableRooms: 5,
    },
  });

  // Room 2: This room will have no bookings and should be available.
  const room2 = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      name: "Deluxe Room",
      amenities: JSON.stringify(["WiFi", "Air Conditioning", "TV", "Mini Bar"]),
      pricePerNight: 150,
      images: JSON.stringify(["https://example.com/room2.jpg"]),
      availableRooms: 3,
    },
  });

  // Create a booking for room1 that overlaps the search period.
  await prisma.booking.create({
    data: {
      userId: owner.id, // using the owner as the booking user for simplicity
      hotelId: hotel.id,
      roomId: room1.id,
      checkIn: new Date("2024-11-22T00:00:00.000Z"),
      checkOut: new Date("2024-11-24T00:00:00.000Z"),
      status: "CONFIRMED",
    },
  });

  console.log("Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
