export async function geocodeAddress(address) {
    const encodedAddress = encodeURIComponent(address);
    //Nominatim OpenStreetMap API, this is free
    // dont need an api key for Nominatim
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        // Nominatim requires a valid User-Agent
        "User-Agent": "FlyNextApp/1.0 (tahahashim10@gmail.com)"
      }
    });
    if (!res.ok) {
      throw new Error("Error geocoding address");
    }
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } else {
        return { lat: null, lng: null };
    }
    
  }
  
