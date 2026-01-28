const { scrapeAmerican } = require('./american');
const { scrapeUnited } = require('./united');
const { scrapeDelta } = require('./delta');
const { scrapeAlaska } = require('./alaska');
const { scrapeJetBlue } = require('./jetblue');
const { scrapeSouthwest } = require('./southwest');
const { scrapeBritish } = require('./british');
const { scrapeAirFrance } = require('./airfrance');
const { scrapeVirgin } = require('./virgin');
const { scrapeEmirates } = require('./emirates');
const { scrapeSingapore } = require('./singapore');
const { scrapeCathay } = require('./cathay');
const { scrapeQantas } = require('./qantas');
const { scrapeANA } = require('./ana');

const AIRLINES = {
    'AA': { name: 'American Airlines', scraper: scrapeAmerican, region: 'US', loginRequired: false },
    'UA': { name: 'United Airlines', scraper: scrapeUnited, region: 'US', loginRequired: true },
    'DL': { name: 'Delta Air Lines', scraper: scrapeDelta, region: 'US', loginRequired: false },
    'AS': { name: 'Alaska Airlines', scraper: scrapeAlaska, region: 'US', loginRequired: false },
    'B6': { name: 'JetBlue', scraper: scrapeJetBlue, region: 'US', loginRequired: false },
    'WN': { name: 'Southwest Airlines', scraper: scrapeSouthwest, region: 'US', loginRequired: false },
    'BA': { name: 'British Airways', scraper: scrapeBritish, region: 'EU', loginRequired: true },
    'AF': { name: 'Air France / Flying Blue', scraper: scrapeAirFrance, region: 'EU', loginRequired: false },
    'VS': { name: 'Virgin Atlantic', scraper: scrapeVirgin, region: 'EU', loginRequired: false },
    'EK': { name: 'Emirates', scraper: scrapeEmirates, region: 'ME', loginRequired: false },
    'SQ': { name: 'Singapore Airlines', scraper: scrapeSingapore, region: 'APAC', loginRequired: true },
    'CX': { name: 'Cathay Pacific', scraper: scrapeCathay, region: 'APAC', loginRequired: true },
    'QF': { name: 'Qantas', scraper: scrapeQantas, region: 'APAC', loginRequired: false },
    'NH': { name: 'ANA', scraper: scrapeANA, region: 'APAC', loginRequired: true }
};

function getAirlineList() {
    return Object.entries(AIRLINES).map(([code, info]) => ({
          code, name: info.name, region: info.region, loginRequired: info.loginRequired
    }));
}

async function searchAllAirlines({ from, to, date, cabin = 'business', airlines = null }) {
    const airlinesToSearch = airlines || Object.keys(AIRLINES);
    const normalizedCabin = cabin.toLowerCase();
    const startTime = Date.now();
    const results = {
          search: { from, to, date, cabin: normalizedCabin },
          airlines: {},
          summary: { totalFlights: 0, bestDeals: [], searchTime: 0, airlinesSearched: airlinesToSearch.length, successCount: 0, errorCount: 0, cabin: normalizedCabin },
          errors: []
    };

  const scraperPromises = airlinesToSearch.map(code => {
        const airline = AIRLINES[code];
        if (!airline) return Promise.resolve({ airline: code, name: 'Unknown', error: 'Not supported' });
        return airline.scraper(from, to, date, normalizedCabin)
          .then(flights => ({ airline: code, name: airline.name, region: airline.region, loginRequired: airline.loginRequired, flights }))
          .catch(error => ({ airline: code, name: airline.name, region: airline.region, loginRequired: airline.loginRequired, error: error.message }));
  });

  const scraperResults = await Promise.all(scraperPromises);

  scraperResults.forEach(result => {
        if (result.error) {
                results.errors.push({ airline: result.airline, name: result.name, error: result.error });
                results.airlines[result.airline] = { name: result.name, region: result.region, loginRequired: result.loginRequired, status: 'error', error: result.error, flights: [] };
                results.summary.errorCount++;
        } else {
                let flights = Array.isArray(result.flights) ? result.flights : [];
                if (result.flights && result.flights.error === 'LOGIN_REQUIRED') {
                          results.airlines[result.airline] = { name: result.name, region: result.region, loginRequired: true, status: 'login_required', message: result.flights.message, flights: [] };
                          results.summary.errorCount++;
                          return;
                }
                flights = flights.filter(f => {
                          if (f.cabin && f.cabin.toLowerCase() === normalizedCabin) return true;
                          if (f.cabins && f.cabins[normalizedCabin] && f.cabins[normalizedCabin].available) return true;
                          if (!f.cabin && !f.cabins && (f.miles || f.points)) { f.cabinUnverified = true; return true; }
                          return false;
                });
                results.airlines[result.airline] = { name: result.name, region: result.region, loginRequired: result.loginRequired, status: 'success', cabin: normalizedCabin, flightCount: flights.length, flights };
                results.summary.totalFlights += flights.length;
                results.summary.successCount++;
                flights.forEach(f => {
                          let miles = (f.cabins && f.cabins[normalizedCabin]) ? f.cabins[normalizedCabin].miles : (f.miles || f.points);
                          if (miles > 0) results.summary.bestDeals.push({ airline: result.airline, airlineName: result.name, flightNumber: f.flightNumber || '', departureTime: f.departureTime || '', arrivalTime: f.arrivalTime || '', duration: f.duration || '', stops: f.stops || '', miles, cabin: normalizedCabin });
                });
        }
  });

  results.summary.bestDeals.sort((a, b) => (a.miles || 999999) - (b.miles || 999999));
    results.summary.bestDeals = results.summary.bestDeals.slice(0, 20);
    results.summary.searchTime = Date.now() - startTime;
    return results;
}

module.exports = { searchAllAirlines, getAirlineList, AIRLINES, scrapeAmerican, scrapeUnited, scrapeDelta, scrapeAlaska, scrapeJetBlue, scrapeSouthwest, scrapeBritish, scrapeAirFrance, scrapeVirgin, scrapeEmirates, scrapeSingapore, scrapeCathay, scrapeQantas, scrapeANA };
