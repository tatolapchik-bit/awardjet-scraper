// Safe require - returns null if module not found
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
