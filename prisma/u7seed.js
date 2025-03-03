// prisma/test-room.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clean up previous test data
  await prisma.booking.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.hotel.deleteMany({});
  await prisma.user.deleteMany({});

  // Create a hotel owner (needed for room association)
  const owner = await prisma.user.create({
    data: {
      firstName: "Room",
      lastName: "Tester",
      email: "roomtester@example.com",
      password: "hashedpassword", // In production, use a securely hashed password
      role: "HOTEL_OWNER",
    },
  });

  // Create a hotel record to which rooms will be linked
  const hotel = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: "Room Test Hotel",
      logo: "https://example.com/roomhotel.png",
      address: "456 Another Ave",
      location: "Roomville, CA",
      starRating: 5,
      images: ["https://example.com/hotel3.png"],
    },
  });

  // Create room types for the hotel (user story: "Define room types")
  const twinRoom = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      name: "Twin Room",
      amenities: ["Two single beds", "WiFi", "TV"],
      pricePerNight: 120.0,
      images: ["https://example.com/twin1.jpg", "https://example.com/twin2.jpg"],
      availableRooms: 10,
    },
  });

  const doubleRoom = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      name: "Double Room",
      amenities: ["One double bed", "WiFi", "TV", "Mini Fridge"],
      pricePerNight: 150.0,
      images: ["https://example.com/double1.jpg", "https://example.com/double2.jpg"],
      availableRooms: 5,
    },
  });

  console.log("Room user story test: Room types created successfully:");
  console.log(twinRoom, doubleRoom);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

