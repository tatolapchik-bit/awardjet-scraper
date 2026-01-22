const axios = require('axios');

// Airline configurations with demo data
const AIRLINES = {
      'AA': { name: 'American Airlines', code: 'AA', region: 'US', alliance: 'oneworld' },
      'UA': { name: 'United Airlines', code: 'UA', region: 'US', alliance: 'Star Alliance' },
      'DL': { name: 'Delta Air Lines', code: 'DL', region: 'US', alliance: 'SkyTeam' },
      'BA': { name: 'British Airways', code: 'BA', region: 'EU', alliance: 'oneworld' },
      'LH': { name: 'Lufthansa', code: 'LH', region: 'EU', alliance: 'Star Alliance' },
      'AF': { name: 'Air France', code: 'AF', region: 'EU', alliance: 'SkyTeam' },
      'EK': { name: 'Emirates', code: 'EK', region: 'ME', alliance: 'none' },
      'QR': { name: 'Qatar Airways', code: 'QR', region: 'ME', alliance: 'oneworld' },
      'SQ': { name: 'Singapore Airlines', code: 'SQ', region: 'Asia', alliance: 'Star Alliance' },
      'CX': { name: 'Cathay Pacific', code: 'CX', region: 'Asia', alliance: 'oneworld' },
      'NH': { name: 'ANA', code: 'NH', region: 'Asia', alliance: 'Star Alliance' },
      'JL': { name: 'Japan Airlines', code: 'JL', region: 'Asia', alliance: 'oneworld' },
      'QF': { name: 'Qantas', code: 'QF', region: 'Pacific', alliance: 'oneworld' },
      'AC': { name: 'Air Canada', code: 'AC', region: 'NA', alliance: 'Star Alliance' }
};

// Generate realistic demo flight data
function generateDemoFlight(airline, from, to, date, cabin) {
      const times = ['06:00', '08:30', '10:15', '12:45', '14:30', '16:00', '18:30', '21:00'];
      const depTime = times[Math.floor(Math.random() * times.length)];
      const flightNum = Math.floor(Math.random() * 900) + 100;

  const milesMap = {
          'economy': { min: 15000, max: 35000 },
          'business': { min: 50000, max: 120000 },
          'first': { min: 80000, max: 200000 }
  };
      const range = milesMap[cabin] || milesMap['business'];
      const miles = Math.floor(Math.random() * (range.max - range.min) + range.min);

  return {
          airline: airline.code,
          airlineName: airline.name,
          flightNumber: airline.code + flightNum,
          departure: from,
          arrival: to,
          departureTime: depTime,
          date: date,
          cabin: cabin,
          miles: miles.toLocaleString(),
          available: Math.random() > 0.3,
          seats: Math.floor(Math.random() * 4) + 1
  };
}

// Scraper function for each airline
async function scrapeAirline(airlineCode, from, to, date, cabin) {
      const airline = AIRLINES[airlineCode];
      if (!airline) return [];

  console.log(`[${airlineCode}] Searching ${from} -> ${to} on ${date}`);

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  // Generate 1-3 demo flights
  const numFlights = Math.floor(Math.random() * 3) + 1;
      const flights = [];

  for (let i = 0; i < numFlights; i++) {
          flights.push(generateDemoFlight(airline, from, to, date, cabin));
  }

  return flights;
}

// Search all airlines in parallel
async function searchAllAirlines({ from, to, date, cabin = 'business', airlines = null }) {
      const airlinesToSearch = airlines 
    ? airlines.filter(code => AIRLINES[code]).map(code => ({ code, ...AIRLINES[code] }))
              : Object.entries(AIRLINES).map(([code, info]) => ({ code, ...info }));

  console.log(`Searching ${airlinesToSearch.length} airlines for ${from} -> ${to} on ${date}`);

  const results = await Promise.allSettled(
          airlinesToSearch.map(async (airline) => {
                    try {
                                const flights = await scrapeAirline(airline.code, from, to, date, cabin);
                                return { 
                                              airline: airline.code, 
                                              name: airline.name, 
                                              region: airline.region,
                                              alliance: airline.alliance,
                                              success: true, 
                                              flights 
                                };
                    } catch (error) {
                                console.error(`[${airline.code}] Error:`, error.message);
                                return { 
                                              airline: airline.code, 
                                              name: airline.name, 
                                              region: airline.region,
                                              alliance: airline.alliance,
                                              success: false, 
                                              error: error.message, 
                                              flights: [] 
                                };
                    }
          })
        );

  return results.map(r => r.status === 'fulfilled' ? r.value : r.reason);
}

// Get list of supported airlines
function getSupportedAirlines() {
      return Object.entries(AIRLINES).map(([code, info]) => ({
              code,
              ...info
      }));
}

module.exports = { 
      searchAllAirlines, 
      scrapeAirline,
      getSupportedAirlines,
      AIRLINES 
};
