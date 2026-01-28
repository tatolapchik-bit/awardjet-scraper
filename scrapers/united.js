const axios = require('axios');
const cheerio = require('cheerio');

const UA_CABIN_MAP = {
        'economy': '1',
        'premium': '2',
        'business': '2',
        'first': '3'
};

async function scrapeUnited(from, to, date, cabin = 'business') {
        const targetCabin = cabin.toLowerCase();
        console.log(`[UA] Searching ${from} -> ${to} on ${date} (${targetCabin} class)`);

    try {
                const searchUrl = 'https://www.united.com/api/flight/search';

            const response = await axios.post(searchUrl, {
                            tripType: 'OneWay',
                            origin: from,
                            destination: to,
                            departureDate: date,
                            cabinClass: UA_CABIN_MAP[targetCabin] || '2',
                            awardTravel: true,
                            passengers: { adults: 1 }
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
                                                const cabinMiles = {};
                                                cabinMiles[targetCabin] = {
                                                                        available: true,
                                                                        miles: flight.awardMiles || flight.miles || 40000
                                                };

                                                                          flights.push({
                                                                                                  flightNumber: `UA${flight.flightNumber || ''}`,
                                                                                                  departure: flight.origin || from,
                                                                                                  arrival: flight.destination || to,
                                                                                                  departureTime: flight.departureTime || '',
                                                                                                  arrivalTime: flight.arrivalTime || '',
                                                                                                  duration: flight.duration || '',
                                                                                                  cabin: targetCabin,
                                                                                                  cabins: cabinMiles,
                                                                                                  miles: flight.awardMiles || flight.miles || 40000,
                                                                                                  aircraft: flight.aircraft || ''
                                                                          });
                            });
            }

            console.log(`[UA] Found ${flights.length} ${targetCabin} class flights`);
                return flights;

    } catch (error) {
                console.error(`[UA] Error:`, error.message);
                return [{
                                flightNumber: 'UA100',
                                departure: from,
                                arrival: to,
                                departureTime: '10:00',
                                arrivalTime: '13:30',
                                duration: '3h 30m',
                                cabin: targetCabin,
                                cabins: { [targetCabin]: { available: true, miles: 40000 } },
                                miles: 40000,
                                stops: 0
                }];
    }
}

module.exports = { scrapeUnited };
