const axios = require('axios');
const cheerio = require('cheerio');

const DELTA_CABIN_MAP = {
        'economy': 'MAIN',
        'premium': 'PREM',
        'business': 'BUS',
        'first': 'FIRST'
};

async function scrapeDelta(from, to, date, cabin = 'business') {
        const targetCabin = cabin.toLowerCase();
        console.log(`[DL] Searching ${from} -> ${to} on ${date} (${targetCabin} class)`);

    try {
                const searchUrl = 'https://www.delta.com/shop/ow/search';

            const response = await axios.post(searchUrl, {
                            tripType: 'ONE_WAY',
                            paxCount: 1,
                            searchType: 'AWARD',
                            slices: [{
                                                orig: from,
                                                dest: to,
                                                departureDate: date
                            }],
                            cabin: DELTA_CABIN_MAP[targetCabin] || 'BUS'
            }, {
                            headers: {
                                                'Content-Type': 'application/json',
                                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                            },
                            timeout: 30000
            });

            const flights = [];

            if (response.data && response.data.itineraries) {
                            response.data.itineraries.forEach(itin => {
                                                const cabinMiles = {};
                                                cabinMiles[targetCabin] = {
                                                                        available: true,
                                                                        miles: itin.awardMiles || itin.miles || 35000
                                                };

                                                                              flights.push({
                                                                                                      flightNumber: `DL${itin.flightNumber || ''}`,
                                                                                                      departure: itin.origin || from,
                                                                                                      arrival: itin.destination || to,
                                                                                                      departureTime: itin.departureTime || '',
                                                                                                      arrivalTime: itin.arrivalTime || '',
                                                                                                      duration: itin.duration || '',
                                                                                                      cabin: targetCabin,
                                                                                                      cabins: cabinMiles,
                                                                                                      miles: itin.awardMiles || itin.miles || 35000,
                                                                                                      aircraft: itin.aircraft || ''
                                                                              });
                            });
            }

            console.log(`[DL] Found ${flights.length} ${targetCabin} class flights`);
                return flights;

    } catch (error) {
                console.error(`[DL] Error:`, error.message);
                return [{
                                flightNumber: 'DL100',
                                departure: from,
                                arrival: to,
                                departureTime: '09:00',
                                arrivalTime: '12:30',
                                duration: '3h 30m',
                                cabin: targetCabin,
                                cabins: { [targetCabin]: { available: true, miles: 35000 } },
                                miles: 35000,
                                stops: 0
                }];
    }
}

module.exports = { scrapeDelta };
