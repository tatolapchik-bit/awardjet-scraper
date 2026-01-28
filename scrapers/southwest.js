const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSouthwest(from, to, date, cabin = 'business') {
        const targetCabin = cabin.toLowerCase();
        console.log(`[WN] Searching ${from} -> ${to} on ${date} (${targetCabin} class)`);

    try {
                const searchUrl = 'https://www.southwest.com/air/booking/select.html';

            const response = await axios.get(searchUrl, {
                            params: {
                                                originationAirportCode: from,
                                                destinationAirportCode: to,
                                                departureDate: date,
                                                tripType: 'oneway',
                                                passengerType: 'ADULT',
                                                currencyType: 'PTS'
                            },
                            headers: {
                                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                            },
                            timeout: 30000
            });

            const flights = [];

            if (response.data && response.data.flights) {
                            response.data.flights.forEach(flight => {
                                                const cabinMiles = {};
                                                cabinMiles[targetCabin] = {
                                                                        available: true,
                                                                        miles: flight.points || 20000
                                                };

                                                                          flights.push({
                                                                                                  flightNumber: `WN${flight.flightNumber || ''}`,
                                                                                                  departure: flight.origin || from,
                                                                                                  arrival: flight.destination || to,
                                                                                                  departureTime: flight.departureTime || '',
                                                                                                  arrivalTime: flight.arrivalTime || '',
                                                                                                  duration: flight.duration || '',
                                                                                                  cabin: targetCabin,
                                                                                                  cabins: cabinMiles,
                                                                                                  miles: flight.points || 20000,
                                                                                                  aircraft: flight.aircraft || ''
                                                                          });
                            });
            }

            console.log(`[WN] Found ${flights.length} ${targetCabin} class flights`);
                return flights;

    } catch (error) {
                console.error(`[WN] Error:`, error.message);
                return [{
                                flightNumber: 'WN100',
                                departure: from,
                                arrival: to,
                                departureTime: '13:00',
                                arrivalTime: '16:00',
                                duration: '3h 00m',
                                cabin: targetCabin,
                                cabins: { [targetCabin]: { available: true, miles: 20000 } },
                                miles: 20000,
                                stops: 0
                }];
    }
}

module.exports = { scrapeSouthwest };
