import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET() {
  try {
    const airports = await prisma.airport.findMany();
    return NextResponse.json(airports, { status: 200 });
  } catch (error) {
    console.error('Error fetching airports:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
