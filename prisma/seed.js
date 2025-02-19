import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Seed script generated with assistance from ChatGPT.
 * This script creates dummy data for hotel owners, hotels, and rooms.
 * https://openai.com/blog/chatgpt
 */

await prisma.booking.deleteMany({});
await prisma.room.deleteMany({});
await prisma.hotel.deleteMany({});
await prisma.user.deleteMany({});


async function main() {
    // Create a sample user (hotel owner)
    const owner = await prisma.user.create({
      data: {
        firstName: "Alice",
        lastName: "Owner",
        email: "alice@example.com",
        password: "hashedpassword", // In practice, hash this!
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
        images: JSON.stringify(["https://example.com/hotel1-1.jpg", "https://example.com/hotel1-2.jpg"]),
      },
    });
  
    // Create a room for the hotel
    await prisma.room.create({
      data: {
        hotelId: hotel.id,
        name: "Standard Room",
        amenities: JSON.stringify(["WiFi", "Air Conditioning", "TV"]),
        pricePerNight: 100,
        images: JSON.stringify(["https://example.com/room1.jpg"]),
        availableRooms: 5,
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