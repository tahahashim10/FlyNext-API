import { NextResponse } from "next/server";
import { getSearchParams } from "@/utils/query";
import { addLayoverInfo } from "@/utils/flightUtils";

export async function GET(request) {
  const { origin, destination, date, returnDate } = getSearchParams(request);

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


  // helper func to call the AFS API for flights (since we'll call it twice to hadle one-way and round-trips flights)
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
    // from origin to destination on the specified date
    const flightThereTemp = await callAfs(origin, destination, date);
    const flightThere = { results: flightThereTemp.results.map(addLayoverInfo) }; // add the layer info for U3
    // flightThereTemp.results is flight groups returned by AFS API.

    // if returnDate exists then swap origin and destination
    let flightBack = null;
    if (returnDate) {
        const flightBackTemp = await callAfs(destination, origin, returnDate);
        flightBack = { results: flightBackTemp.results.map(addLayoverInfo) }; // add the layer info for U3
    }

    return NextResponse.json({ flightThere, flightBack }, { status: 200 });

  } catch (error) {
    console.error("Error calling AFS API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
