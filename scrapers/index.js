const { scrapeAmerican } = require('./american');
const { scrapeDelta } = require('./delta');
const { scrapeUnited } = require('./united');
const { scrapeAlaska } = require('./alaska');
const { scrapeJetBlue } = require('./jetblue');
const { scrapeSouthwest } = require('./southwest');
const { scrapeBritish } = require('./british');
const { scrapeAirFrance } = require('./airfrance');

const AIRLINES = {
            'AA': { name: 'American Airlines', scraper: scrapeAmerican, region: 'US' },
            'DL': { name: 'Delta Air Lines', scraper: scrapeDelta, region: 'US' },
            'UA': { name: 'United Airlines', scraper: scrapeUnited, region: 'US' },
            'AS': { name: 'Alaska Airlines', scraper: scrapeAlaska, region: 'US' },
            'B6': { name: 'JetBlue', scraper: scrapeJetBlue, region: 'US' },
            'WN': { name: 'Southwest Airlines', scraper: scrapeSouthwest, region: 'US' },
            'BA': { name: 'British Airways', scraper: scrapeBritish, region: 'EU' },
            'AF': { name: 'Air France', scraper: scrapeAirFrance, region: 'EU' }
};

function getSupportedAirlines() {
            return Object.entries(AIRLINES).map(([code, info]) => ({
                          code, name: info.name, region: info.region
            }));
}

async function searchAllAirlines({ from, to, date, cabin = 'business', airlines = null }) {
            const airlinesToSearch = airlines || Object.keys(AIRLINES);
            const normalizedCabin = cabin.toLowerCase();
            console.log(`Searching ${from} -> ${to} on ${date}, cabin: ${normalizedCabin}`);

  const promises = airlinesToSearch.map(async code => {
                const airline = AIRLINES[code];
                if (!airline || !airline.scraper) {
                                return { code, name: code, flights: [], error: 'No scraper' };
                }
                try {
                                const flights = await airline.scraper(from, to, date, normalizedCabin);
                                return { code, name: airline.name, flights: Array.isArray(flights) ? flights : [] };
                } catch (err) {
                                return { code, name: airline.name, flights: [], error: err.message };
                }
  });

  const results = await Promise.all(promises);
            const allFlights = [];
            results.forEach(r => {
                          r.flights.forEach(f => allFlights.push({ ...f, airlineCode: r.code, airlineName: r.name }));
            });

  return {
                search: { from, to, date, cabin: normalizedCabin },
                summary: { totalFlights: allFlights.length, cabin: normalizedCabin },
                results: allFlights
  };
}

module.exports = { searchAllAirlines, getSupportedAirlines, AIRLINES };
