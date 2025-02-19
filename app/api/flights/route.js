import { NextResponse } from "next/server";
import { getSearchParams } from "@/utils/query";

export async function GET(request) {
  const { origin, destination, date } = getSearchParams(request);

  if (!origin || !destination || !date) {
    return NextResponse.json({ error: "source, destination, and date are required" }, { status: 400 });
  }

  // Build URL for AFS API
  const baseUrl = process.env.AFS_BASE_URL;
  const url = new URL("/api/flights", baseUrl);
  url.search = new URLSearchParams({ origin, destination, date }).toString();

  // Get API key
  const apiKey = process.env.AFS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AFS API key is not configured" }, { status: 500 });
  }

  try {
    // Call the AFS API and check if it returns errors
    // source: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    const res = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Error retrieving flights" }, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error calling AFS API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
