const { scrapeAmerican } = require('./american');
const { scrapeDelta } = require('./delta');
const { scrapeUnited } = require('./united');
const { scrapeAlaska } = require('./alaska');
const { scrapeJetBlue } = require('./jetblue');
const { scrapeSouthwest } = require('./southwest');
const { scrapeBritish } = require('./british');
const { scrapeAirFrance } = require('./airfrance');

// Airline configuration - only include scrapers that exist
const AIRLINES = {
          'AA': { name: 'American Airlines', scraper: scrapeAmerican, region: 'US', loginRequired: false },
          'DL': { name: 'Delta Air Lines', scraper: scrapeDelta, region: 'US', loginRequired: false },
          'UA': { name: 'United Airlines', scraper: scrapeUnited, region: 'US', loginRequired: true },
          'AS': { name: 'Alaska Airlines', scraper: scrapeAlaska, region: 'US', loginRequired: false },
          'B6': { name: 'JetBlue', scraper: scrapeJetBlue, region: 'US', loginRequired: false },
          'WN': { name: 'Southwest Airlines', scraper: scrapeSouthwest, region: 'US', loginRequired: false },
          'BA': { name: 'British Airways', scraper: scrapeBritish, region: 'EU', loginRequired: true },
          'AF': { name: 'Air France', scraper: scrapeAirFrance, region: 'EU', loginRequired: false }
};

// Get list of supported airlines (required by server.js)
function getSupportedAirlines() {
          return Object.entries(AIRLINES).map(([code, info]) => ({
                      code,
                      name: info.name,
                      region: info.region,
                      loginRequired: info.loginRequired
          }));
}

// Also export as getAirlineList for compatibility
const getAirlineList = getSupportedAirlines;

// Search all airlines in parallel
async function searchAllAirlines({ from, to, date, cabin = 'business', airlines = null }) {
          const airlinesToSearch = airlines || Object.keys(AIRLINES);
          const normalizedCabin = cabin.toLowerCase();
        
          console.log(`Searching ${from} -> ${to} on ${date}, cabin: ${normalizedCabin}`);
        
          const promises = airlinesToSearch.map(async code => {
                      const airline = AIRLINES[code];
                      if (!airline || !airline.scraper) {
                                    return { code, name: airline?.name || code, flights: [], error: 'No scraper available' };
                      }
                      try {
                                    const flights = await airline.scraper(from, to, date, normalizedCabin);
                                    return { code, name: airline.name, region: airline.region, flights: Array.isArray(flights) ? flights : [] };
                      } catch (err) {
                                    console.error(`[${code}] Scraper error:`, err.message);
                                    return { code, name: airline.name, region: airline.region, flights: [], error: err.message };
                      }
          });
        
          const results = await Promise.all(promises);
          
          // Aggregate all flights
          const allFlights = [];
          const airlineResults = {};
          
          results.forEach(r => {
                      airlineResults[r.code] = {
                                    name: r.name,
                                    region: r.region,
                                    status: r.error ? 'error' : 'success',
                                    error: r.error,
                                    flightCount: r.flights.length,
                                    flights: r.flights
                      };
                      
                      r.flights.forEach(f => {
                                    allFlights.push({
                                                    ...f,
                                                    airlineCode: r.code,
                                                    airlineName: r.name
                                    });
                      });
          });
        
          // Filter by cabin class
          const filteredFlights = allFlights.filter(f => {
                      if (f.cabin && f.cabin.toLowerCase() === normalizedCabin) return true;
                      if (f.cabins && f.cabins[normalizedCabin]?.available) return true;
                      return f.miles || f.points; // Include if has miles data
          });
        
          // Sort by miles ascending
          filteredFlights.sort((a, b) => {
                      const aMiles = a.cabins?.[normalizedCabin]?.miles || a.miles || a.points || 999999;
                      const bMiles = b.cabins?.[normalizedCabin]?.miles || b.miles || b.points || 999999;
                      return aMiles - bMiles;
          });
        
          return {
                      search: { from, to, date, cabin: normalizedCabin },
                      airlines: airlineResults,
                      summary: {
                                    totalFlights: filteredFlights.length,
                                    cabin: normalizedCabin,
                                    airlinesSearched: airlinesToSearch.length
                      },
                      bestDeals: filteredFlights.slice(0, 20)
          };
}

module.exports = {
          searchAllAirlines,
          getSupportedAirlines,
          getAirlineList,
          AIRLINES
};// Safe require - returns null if module not found
function safeRequire(path) {
        try { return require(path); } catch (e) { console.log('Module not found:', path); return null; }
}

const { scrapeAmerican } = safeRequire('./american') || {};
const { scrapeDelta } = safeRequire('./delta') || {};
const { scrapeUnited } = safeRequire('./united') || {};
const { scrapeAlaska } = safeRequire('./alaska') || {};
const { scrapeJetBlue } = safeRequire('./jetblue') || {};
const { scrapeSouthwest } = safeRequire('./southwest') || {};
const { scrapeBritish } = safeRequire('./british') || {};
const { scrapeAirFrance } = safeRequire('./airfrance') || {};
const { scrapeVirgin } = safeRequire('./virgin') || {};
const { scrapeEmirates } = safeRequire('./emirates') || {};
const { scrapeSingapore } = safeRequire('./singapore') || {};
const { scrapeCathay } = safeRequire('./cathay') || {};
const { scrapeQantas } = safeRequire('./qantas') || {};
const { scrapeANA } = safeRequire('./ana') || {};

const AIRLINES = {
        'AA': { name: 'American Airlines', scraper: scrapeAmerican, region: 'US' },
        'DL': { name: 'Delta Air Lines', scraper: scrapeDelta, region: 'US' },
        'UA': { name: 'United Airlines', scraper: scrapeUnited, region: 'US' },
        'AS': { name: 'Alaska Airlines', scraper: scrapeAlaska, region: 'US' },
        'B6': { name: 'JetBlue', scraper: scrapeJetBlue, region: 'US' },
        'WN': { name: 'Southwest Airlines', scraper: scrapeSouthwest, region: 'US' },
        'BA': { name: 'British Airways', scraper: scrapeBritish, region: 'EU' },
        'AF': { name: 'Air France', scraper: scrapeAirFrance, region: 'EU' },
        'VS': { name: 'Virgin Atlantic', scraper: scrapeVirgin, region: 'EU' },
        'EK': { name: 'Emirates', scraper: scrapeEmirates, region: 'ME' },
        'SQ': { name: 'Singapore Airlines', scraper: scrapeSingapore, region: 'APAC' },
        'CX': { name: 'Cathay Pacific', scraper: scrapeCathay, region: 'APAC' },
        'QF': { name: 'Qantas', scraper: scrapeQantas, region: 'APAC' },
        'NH': { name: 'ANA', scraper: scrapeANA, region: 'APAC' }
};

function getSupportedAirlines() {
        return Object.entries(AIRLINES)
          .filter(([code, info]) => info.scraper)
          .map(([code, info]) => ({ code, name: info.name, region: info.region }));
}

async function searchAllAirlines({ from, to, date, cabin = 'business', airlines = null }) {
        const airlinesToSearch = airlines || Object.keys(AIRLINES).filter(code => AIRLINES[code].scraper);
        const normalizedCabin = cabin.toLowerCase();
        console.log(`Searching ${from} -> ${to} on ${date}, cabin: ${normalizedCabin}`);

  const promises = airlinesToSearch.map(async code => {
            const airline = AIRLINES[code];
            if (!airline || !airline.scraper) return { code, name: airline?.name || code, flights: [], error: 'No scraper' };
            try {
                        const flights = await airline.scraper(from, to, date, normalizedCabin);
                        return { code, name: airline.name, flights: Array.isArray(flights) ? flights : [] };
            } catch (err) {
                        return { code, name: airline.name, flights: [], error: err.message };
            }
  });

  const results = await Promise.all(promises);
        const allFlights = results.flatMap(r => r.flights.map(f => ({ ...f, airlineCode: r.code, airlineName: r.name })));

  return {
            search: { from, to, date, cabin: normalizedCabin },
            results: allFlights.filter(f => {
                        if (f.cabin && f.cabin.toLowerCase() === normalizedCabin) return true;
                        if (f.cabins && f.cabins[normalizedCabin]?.available) return true;
                        return f.miles || f.points;
            }),
            summary: { totalFlights: allFlights.length, cabin: normalizedCabin }
  };
}

module.exports = { searchAllAirlines, getSupportedAirlines, AIRLINES };
