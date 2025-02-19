// add layover information to multiple leg flight group
export function addLayoverInfo(flightGroup) {
    if (flightGroup.legs === 2 && flightGroup.flights.length === 2) {
      const firstLeg = flightGroup.flights[0];
      const secondLeg = flightGroup.flights[1];
      
      const layover =
        (new Date(secondLeg.departureTime) - new Date(firstLeg.arrivalTime)) / (1000 * 60);
      return { ...flightGroup, layover }; // include all flight info as well as layover info 
    }
    return flightGroup;
  }