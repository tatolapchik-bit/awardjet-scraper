const { scrapeAmerican } = require('./american');

const AIRLINES = {
    'AA': { name: 'American Airlines', scraper: scrapeAmerican, region: 'US', loginRequired: false }
};

async function searchAllAirlines({ from, to, date, cabin = 'business', airlines = null }) {
    const airlinesToSearch = airlines 
    ? airlines.filter(code => AIRLINES[code]).map(code => ({ code, ...AIRLINES[code] }))
          : Object.entries(AIRLINES).map(([code, info]) => ({ code, ...info }));

  console.log(`Searching ${airlinesToSearch.length} airlines for ${from} -> ${to} on ${date}`);

  const results = await Promise.allSettled(
        airlinesToSearch.map(async (airline) => {
                try {
                          console.log(`[${airline.code}] Starting search...`);
                          const flights = await airline.scraper(from, to, date, cabin);
                          console.log(`[${airline.code}] Found ${flights.length} results`);
                          return { airline: airline.code, name: airline.name, region: airline.region, success: true, flights };
                } catch (error) {
                          console.error(`[${airline.code}] Error:`, error.message);
                          return { airline: airline.code, name: airline.name, region: airline.region, success: false, error: error.message, flights: [] };
                }
        })
      );

  const processed = results.map(r => r.status === 'fulfilled' ? r.value : { ...r.reason, success: false, flights: [] });
    const successful = processed.filter(r => r.success);
    const allFlights = processed.flatMap(r => r.flights.map(f => ({ ...f, airline: r.airline, airlineName: r.name })));

  return {
        search: { from, to, date, cabin },
        summary: { total: airlinesToSearch.length, successful: successful.length, failed: airlinesToSearch.length - successful.length },
        results: processed,
        allFlights: allFlights.sort((a, b) => (a.miles || 999999) - (b.miles || 999999))
  };
}

function getAirlineList() {
    return Object.entries(AIRLINES).map(([code, info]) => ({
          code, name: info.name, region: info.region, loginRequired: info.loginRequired
    }));
}

module.exports = { searchAllAirlines, getAirlineList, AIRLINES };
