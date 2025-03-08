import { NextResponse } from "next/server";
import { getSearchParams } from "@/utils/query";
import { addLayoverInfo, minimalFlightInfo } from "@/utils/flightUtils";

export async function GET(request, { params }) {
  const { id } = params;
  if (!id || typeof id !== "string" || id.trim() === "") {
    return NextResponse.json({ error: "Valid Flight ID required" }, { status: 400 });
  }
  
  const { origin, destination, date } = getSearchParams(request);
  if (!origin || !destination || !date) {
    return NextResponse.json({ error: "source, destination, and date are required" }, { status: 400 });
  }

  // source: https://stackoverflow.com/questions/19577748/what-does-this-javascript-regular-expression-d-mean
  if (/^\d+$/.test(origin)) {
    return NextResponse.json({ error: "Invalid origin: must be a valid city or airport name." }, { status: 400 });
  }
  if (/^\d+$/.test(destination)) {
    return NextResponse.json({ error: "Invalid destination: must be a valid city or airport name." }, { status: 400 });
  }
  
  const trimmedOrigin = origin.trim();
  const trimmedDestination = destination.trim();
  if (!trimmedOrigin || !trimmedDestination) {
    return NextResponse.json({ error: "origin and destination cannot be empty" }, { status: 400 });
  }
  const flightDate = new Date(date);
  if (isNaN(flightDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
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
    if (error.message.includes("AFS API error: 400")) {
      return NextResponse.json(
        { error: "Unable to retrieve flight data. Please ensure that the origin and destination are valid city names or airport codes." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
