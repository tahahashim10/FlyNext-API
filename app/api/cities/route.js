import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET() {
  try {
    const cities = await prisma.city.findMany();
    return NextResponse.json(cities, { status: 200 });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
