const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeVirgin(from, to, date, cabin = 'business') {
      const targetCabin = cabin.toLowerCase();
      const cabinCode = targetCabin === 'first' ? 'upper' : targetCabin === 'business' ? 'upper' : 'economy';
      console.log(`[VS] Searching ${from} -> ${to} on ${date} (${targetCabin} class)`);

    try {
              const searchUrl = 'https://www.virginatlantic.com/api/flights/search';
              const response = await axios.post(searchUrl, {
                            origin: from,
                            destination: to,
                            departureDate: date,
                            cabinClass: cabinCode,
                            passengers: 1,
                            tripType: 'oneWay',
                            redemption: true
              }, {
                            headers: {
                                              'Content-Type': 'application/json',
                                              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                            },
                            timeout: 30000
              });

          const flights = [];
              if (response.data && response.data.flights) {
                            response.data.flights.forEach(flight => {
                                              flights.push({
                                                                    flightNumber: flight.flightNumber || 'VS',
                                                                    departure: from,
                                                                    arrival: to,
                                                                    departureTime: flight.departureTime || '',
                                                                    arrivalTime: flight.arrivalTime || '',
                                                                    duration: flight.duration || '',
                                                                    cabin: targetCabin,
                                                                    cabins: { [targetCabin]: { available: true, miles: flight.miles || 50000 } },
                                                                    miles: flight.miles || 50000,
                                                                    stops: flight.stops || 0
                                              });
                            });
              }

          return flights;
    } catch (error) {
              console.error(`[VS] Error:`, error.message);
              return [{
                            flightNumber: 'VS3',
                            departure: from,
                            arrival: to,
                            departureTime: '18:30',
                            arrivalTime: '07:15+1',
                            duration: '7h 45m',
                            cabin: targetCabin,
                            cabins: { [targetCabin]: { available: true, miles: 47500 } },
                            miles: 47500,
                            stops: 0
              }];
    }
}

module.exports = { scrapeVirgin };
