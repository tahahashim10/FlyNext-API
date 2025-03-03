import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { isValidCardNumber, isValidExpiry } from '@/utils/validation';

export async function POST(request) {
    try {
        const { bookingId, cardNumber, expiryMonth, expiryYear } = await request.json();

        if (!bookingId || !cardNumber || !expiryMonth || !expiryYear) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Validate card number and expiry date
        if (!isValidCardNumber(cardNumber)) {
            return NextResponse.json({ error: "Invalid credit card number" }, { status: 400 });
        }

        if (!isValidExpiry(expiryMonth, expiryYear)) {
            return NextResponse.json({ error: "Expired card" }, { status: 400 });
        }

        // Find the booking
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { user: true, hotel: true, room: true },
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Mark the booking as confirmed
        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "CONFIRMED" },
        });

        return NextResponse.json({
            message: "Booking confirmed",
            booking: updatedBooking,
        }, { status: 200 });

    } catch (error) {
        console.error("Checkout Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}