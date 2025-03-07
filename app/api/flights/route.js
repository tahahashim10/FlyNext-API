import { NextResponse } from "next/server";
import { getSearchParams } from "@/utils/query";
import { addLayoverInfo, minimalFlightInfo  } from "@/utils/flightUtils";

export async function GET(request) {
  const { origin, destination, date, returnDate } = getSearchParams(request);

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
  if (returnDate) {
    const returnFlightDate = new Date(returnDate);
    if (isNaN(returnFlightDate.getTime())) {
      return NextResponse.json({ error: "Invalid return date format" }, { status: 400 });
    }
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
    // from origin to destination on the specified date
    let flightThereTemp;
    try {
      flightThereTemp = await callAfs(origin, destination, date);
    } catch (error) {
      return NextResponse.json({ error: "Unable to retrieve flight data. Please ensure that the origin and destination are valid city names or airport codes." }, { status: 400 });
    }
    
    // first add layover info then reduce each flight group to minimal info
    const flightThere = { results: flightThereTemp.results.map(addLayoverInfo).map(minimalFlightInfo), };
    /* 
      .map(addLayoverInfo) => First, it adds layover information to each flight group
      .map(minimalFlightInfo) => Then, it reduces the flight group to minimal info

      flightThereTemp.results is flight groups returned by AFS API.
    */

    // if returnDate exists then swap origin and destination
    let flightBack = null;
    if (returnDate) {
        let flightBackTemp;
        try {
          flightBackTemp = await callAfs(destination, origin, returnDate);
        } catch (error) {
          return NextResponse.json({ error: "Unable to retrieve flight data. Please ensure that the origin and destination are valid city names or airport codes." }, { status: 400 });
        }
        
        flightBack = { results: flightBackTemp.results.map(addLayoverInfo).map(minimalFlightInfo), };
        
    }

    return NextResponse.json({ flightThere, flightBack }, { status: 200 });

  } catch (error) {
    console.error("Error calling AFS API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
