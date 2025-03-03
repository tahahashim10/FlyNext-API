import { NextResponse } from "next/server";
import { getSearchParams } from "@/utils/query";
import { addLayoverInfo, minimalFlightInfo } from "@/utils/flightUtils";

export async function GET(request, { params }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Flight ID required" }, { status: 400 });
  }

  const { origin, destination, date } = getSearchParams(request);
  if (!origin || !destination || !date) {
    return NextResponse.json({ error: "source, destination, and date are required" }, { status: 400 });
  }

  // Build URL for AFS API
  const baseUrl = process.env.AFS_BASE_URL;
  // Get API key
  const apiKey = process.env.AFS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AFS API key is not configured" }, { status: 500 });
  }


  // helper func to call the AFS API for flights (since we'll call it twice to handle one-way and round-trips flights)
  async function callAfs(origin, destination, date) {
    const url = new URL("/api/flights", baseUrl);
    url.search = new URLSearchParams({ origin, destination, date }).toString();

    // Call the AFS API and check if it returns errors
    // source: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    const res = await fetch(url, {
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) {
      throw new Error(`AFS API error: ${res.status}`);
    }
    return res.json();
  }

  try {
    // specified date for flight
    const flightData = await callAfs(origin, destination, date);
    
    // add layover info and flatten the groups to a single array of flights
    const flightsList = flightData.results.map(addLayoverInfo).flatMap((group) => group.flights);

    // find flight with matching id
    const matchingFlight = flightsList.find((flight) => flight.id === id);
    if (!matchingFlight) {
    return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }

    return NextResponse.json(matchingFlight, { status: 200 });
  } catch (error) {
    console.error("Error retrieving flight details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
