const axios = require('axios');

const SEATS_AERO_BASE_URL = 'https://seats.aero/partnerapi';

// Cabin class mapping
const CABIN_MAP = {
    'economy': 'Y',
    'premium': 'W',
    'business': 'J',
    'first': 'F'
};

// Source to airline code mapping
const SOURCE_TO_AIRLINE = {
    'american': 'AA',
    'united': 'UA',
    'delta': 'DL',
    'alaska': 'AS',
    'jetblue': 'B6',
    'southwest': 'WN',
    'british': 'BA',
    'airfrance': 'AF',
    'virgin': 'VS',
    'emirates': 'EK',
    'singapore': 'SQ',
    'cathay': 'CX',
    'qantas': 'QF',
    'ana': 'NH',
    'aeromexico': 'AM',
    'lifemiles': 'AV',
    'ethiopian': 'ET',
    'aeroplan': 'AC',
    'smiles': 'G3',
    'velocity': 'VA',
    'eurobonus': 'SK'
};

const AIRLINE_NAMES = {
    'AA': 'American Airlines',
    'UA': 'United Airlines',
    'DL': 'Delta Air Lines',
    'AS': 'Alaska Airlines',
    'B6': 'JetBlue',
    'WN': 'Southwest Airlines',
    'BA': 'British Airways',
    'AF': 'Air France',
    'VS': 'Virgin Atlantic',
    'EK': 'Emirates',
    'SQ': 'Singapore Airlines',
    'CX': 'Cathay Pacific',
    'QF': 'Qantas',
    'NH': 'ANA',
    'AM': 'Aeromexico',
    'AV': 'Avianca LifeMiles',
    'ET': 'Ethiopian Airlines',
    'AC': 'Air Canada',
    'G3': 'GOL Smiles',
    'VA': 'Virgin Australia',
    'SK': 'SAS EuroBonus'
};

async function searchSeatsAero({ from, to, date, cabin = 'business' }) {
    const apiKey = process.env.SEATS_AERO_API_KEY;

  if (!apiKey) {
        console.error('[Seats.aero] No API key configured');
        return { error: 'MISSING_API_KEY', message: 'Seats.aero API key not configured' };
  }

  const cabinCode = CABIN_MAP[cabin.toLowerCase()] || 'J';
    console.log('[Seats.aero] Searching ' + from + ' -> ' + to + ' on ' + date + ' (' + cabin + '/' + cabinCode + ')');

  try {
        const response = await axios.get(SEATS_AERO_BASE_URL + '/search', {
                headers: {
                          'Partner-Authorization': apiKey,
                          'Accept': 'application/json'
                },
                params: {
                          origin_airport: from.toUpperCase(),
                          destination_airport: to.toUpperCase(),
                          start_date: date,
                          end_date: date,
                          cabin: cabinCode
                },
                timeout: 30000
        });

      const data = response.data;
        if (!data || !data.data) {
                console.log('[Seats.aero] No data in response');
                return { flights: [], byAirline: {} };
        }

      const flights = [];
        const airlineResults = {};

      data.data.forEach(function(availability) {
              try {
                        const source = (availability.Route && availability.Route.Source) || 'unknown';
                        const airlineCode = SOURCE_TO_AIRLINE[source] || source.toUpperCase().substring(0, 2);
                        const airlineName = AIRLINE_NAMES[airlineCode] || source;

                let available = false;
                        let mileageCost = null;
                        let directAvailable = false;

                if (cabinCode === 'Y') {
                            available = availability.YAvailable;
                            mileageCost = availability.YMileageCost;
                            directAvailable = availability.YDirectAvailable;
                } else if (cabinCode === 'W') {
                            available = availability.WAvailable;
                            mileageCost = availability.WMileageCost;
                            directAvailable = availability.WDirectAvailable;
                } else if (cabinCode === 'J') {
                            available = availability.JAvailable;
                            mileageCost = availability.JMileageCost;
                            directAvailable = availability.JDirectAvailable;
                } else if (cabinCode === 'F') {
                            available = availability.FAvailable;
                            mileageCost = availability.FMileageCost;
                            directAvailable = availability.FDirectAvailable;
                }

                if (!available) return;

                const flight = {
                            id: availability.ID,
                            airline: airlineName,
                            airlineCode: airlineCode,
                            source: source,
                            origin: (availability.Route && availability.Route.OriginAirport) || from,
                            destination: (availability.Route && availability.Route.DestinationAirport) || to,
                            date: availability.Date,
                            cabin: cabin,
                            cabinCode: cabinCode,
                            miles: mileageCost ? parseInt(mileageCost) : null,
                            available: true,
                            direct: directAvailable || false,
                            distance: (availability.Route && availability.Route.Distance) || null,
                            cabins: {
                                          economy: {
                                                          available: availability.YAvailable || false,
                                                          miles: availability.YMileageCost ? parseInt(availability.YMileageCost) : null,
                                                          direct: availability.YDirectAvailable || false
                                          },
                                          premium: {
                                                          available: availability.WAvailable || false,
                                                          miles: availability.WMileageCost ? parseInt(availability.WMileageCost) : null,
                                                          direct: availability.WDirectAvailable || false
                                          },
                                          business: {
                                                          available: availability.JAvailable || false,
                                                          miles: availability.JMileageCost ? parseInt(availability.JMileageCost) : null,
                                                          direct: availability.JDirectAvailable || false
                                          },
                                          first: {
                                                          available: availability.FAvailable || false,
                                                          miles: availability.FMileageCost ? parseInt(availability.FMileageCost) : null,
                                                          direct: availability.FDirectAvailable || false
                                          }
                            },
                            remainingSeats: availability.RemainingSeats,
                            taxes: availability.TotalTaxes,
                            updatedAt: availability.UpdatedAt
                };

                flights.push(flight);

                if (!airlineResults[airlineCode]) {
                            airlineResults[airlineCode] = {
                                          name: airlineName,
                                          code: airlineCode,
                                          flights: []
                            };
                }
                        airlineResults[airlineCode].flights.push(flight);

              } catch (e) {
                        console.error('[Seats.aero] Error processing result:', e.message);
              }
      });

      console.log('[Seats.aero] Found ' + flights.length + ' ' + cabin + ' class flights');

      return {
              flights: flights,
              byAirline: airlineResults,
              totalResults: data.data.length,
              cabinSearched: cabin
      };

  } catch (error) {
        if (error.response) {
                console.error('[Seats.aero] API error: ' + error.response.status, error.response.data);
                if (error.response.status === 401) {
                          return { error: 'INVALID_API_KEY', message: 'Invalid Seats.aero API key' };
                }
                if (error.response.status === 429) {
                          return { error: 'RATE_LIMITED', message: 'API rate limit reached' };
                }
        }
        console.error('[Seats.aero] Request error:', error.message);
        throw error;
  }
}

function getRegion(airlineCode) {
    var regions = {
          'AA': 'US', 'UA': 'US', 'DL': 'US', 'AS': 'US', 'B6': 'US', 'WN': 'US',
          'BA': 'EU', 'AF': 'EU', 'VS': 'EU', 'SK': 'EU',
          'EK': 'ME',
          'SQ': 'APAC', 'CX': 'APAC', 'QF': 'APAC', 'NH': 'APAC', 'VA': 'APAC',
          'AM': 'LATAM', 'AV': 'LATAM', 'G3': 'LATAM',
          'ET': 'AFRICA',
          'AC': 'NA'
    };
    return regions[airlineCode] || 'OTHER';
}

async function searchAllViaSeatsAero({ from, to, date, cabin = 'business' }) {
    var normalizedCabin = cabin.toLowerCase();
    var startTime = Date.now();

  console.log('\n[AwardJet] Starting Seats.aero search: ' + from + ' -> ' + to + ' on ' + date);
    console.log('   Cabin: ' + normalizedCabin + '\n');

  var results = {
        search: { from: from, to: to, date: date, cabin: normalizedCabin },
        airlines: {},
        summary: {
                totalFlights: 0,
                bestDeals: [],
                searchTime: 0,
                airlinesFound: 0,
                successCount: 0,
                errorCount: 0,
                cabin: normalizedCabin,
                source: 'seats.aero'
        },
        errors: []
  };

  try {
        var seatsData = await searchSeatsAero({ from: from, to: to, date: date, cabin: normalizedCabin });

      if (seatsData.error) {
              results.errors.push({
                        source: 'seats.aero',
                        error: seatsData.error,
                        message: seatsData.message
              });
              results.summary.errorCount = 1;
              return results;
      }

      var flights = seatsData.flights || [];
        var byAirline = seatsData.byAirline || {};

      Object.keys(byAirline).forEach(function(code) {
              var airlineData = byAirline[code];
              results.airlines[code] = {
                        name: airlineData.name,
                        region: getRegion(code),
                        loginRequired: false,
                        status: 'success',
                        cabin: normalizedCabin,
                        flightCount: airlineData.flights.length,
                        flights: airlineData.flights
              };
              results.summary.airlinesFound++;
              results.summary.successCount++;
      });

      results.summary.totalFlights = flights.length;

      flights.forEach(function(flight) {
              if (flight.miles && flight.miles > 0) {
                        results.summary.bestDeals.push({
                                    airline: flight.airlineCode,
                                    airlineName: flight.airline,
                                    source: flight.source,
                                    origin: flight.origin,
                                    destination: flight.destination,
                                    date: flight.date,
                                    miles: flight.miles,
                                    cabin: normalizedCabin,
                                    direct: flight.direct,
                                    remainingSeats: flight.remainingSeats
                        });
              }
      });

      results.summary.bestDeals.sort(function(a, b) {
              return (a.miles || 999999) - (b.miles || 999999);
      });
        results.summary.bestDeals = results.summary.bestDeals.slice(0, 20);

  } catch (error) {
        results.errors.push({
                source: 'seats.aero',
                error: error.message
        });
        results.summary.errorCount = 1;
  }

  results.summary.searchTime = Date.now() - startTime;

  console.log('\n[AwardJet] Search complete in ' + results.summary.searchTime + 'ms');
    console.log('   Total flights found: ' + results.summary.totalFlights);
    console.log('   Airlines: ' + results.summary.airlinesFound);
    console.log('   Best deals: ' + results.summary.bestDeals.length);

  return results;
}

module.exports = {
    searchSeatsAero: searchSeatsAero,
    searchAllViaSeatsAero: searchAllViaSeatsAero,
    CABIN_MAP: CABIN_MAP,
    SOURCE_TO_AIRLINE: SOURCE_TO_AIRLINE,
    AIRLINE_NAMES: AIRLINE_NAMES
};
