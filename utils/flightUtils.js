// add layover information to multiple leg flight group
export function addLayoverInfo(flightGroup) {
    if (flightGroup.legs === 2 && flightGroup.flights.length === 2) {
      const firstLeg = flightGroup.flights[0];
      const secondLeg = flightGroup.flights[1];
      
      // / (1000 * 60) is to convert from milliseconds to minutes
      const layover = (new Date(secondLeg.departureTime) - new Date(firstLeg.arrivalTime)) / (1000 * 60);
      return { ...flightGroup, layover }; // include all flight info as well as layover info 
    }
    return flightGroup;
  }

// only return minimal view of flight group with only departure/arrival times, duration, and layovers
export function minimalFlightInfo(flightGroup) {
  return {
    legs: flightGroup.legs,
    flights: flightGroup.flights.map(({ id, airline, departureTime, arrivalTime, duration, price }) => ({
      id,
      airline,
      departureTime,
      arrivalTime,
      duration,
      price,
    })),
    ...(flightGroup.layover !== undefined && { layover: flightGroup.layover }),
  };
}