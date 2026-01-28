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
      'WN': { name: 'Southwest', scraper: scrapeSouthwest, region: 'US' },
      'BA': { name: 'British Airways', scraper: scrapeBritish, region: 'EU' },
      'AF': { name: 'Air France', scraper: scrapeAirFrance, region: 'EU' },
      'VS': { name: 'Virgin Atlantic', scraper: scrapeVirgin, region: 'EU' },
      'EK': { name: 'Emirates', scraper: scrapeEmirates, region: 'ME' },
      'SQ': { name: 'Singapore Airlines', scraper: scrapeSingapore, region: 'APAC' },
      'CX': { name: 'Cathay Pacific', scraper: scrapeCathay, region: 'APAC' },
      'QF': { name: 'Qantas', scraper: scrapeQantas, region: 'APAC' },
      'NH': { name: 'ANA', scraper: scrapeANA, region: 'APAC' }
};

function getAirlineList() {
      return Object.entries(AIRLINES).map(([code, info]) => ({
              code, name: info.name, region: info.region, available: !!info.scraper
      }));
}

async function searchAllAirlines({ from, to, date, cabin = 'business', airlines = null }) {
      const codes = airlines || Object.keys(AIRLINES);
      const normalizedCabin = cabin.toLowerCase();
      const results = { search: { from, to, date, cabin: normalizedCabin }, airlines: {}, summary: { totalFlights: 0, bestDeals: [] }, errors: [] };

  const promises = codes.map(code => {
          const airline = AIRLINES[code];
          if (!airline || !airline.scraper) {
                    return Promise.resolve({ code, name: airline?.name, error: 'Scraper not available' });
          }
          return airline.scraper(from, to, date, normalizedCabin)
            .then(flights => ({ code, name: airline.name, flights }))
            .catch(err => ({ code, name: airline.name, error: err.message }));
  });

  const scraperResults = await Promise.all(promises);

  scraperResults.forEach(r => {
          if (r.error) {
                    results.errors.push({ airline: r.code, error: r.error });
                    results.airlines[r.code] = { name: r.name, status: 'error', flights: [] };
          } else {
                    let flights = Array.isArray(r.flights) ? r.flights : [];
                    flights = flights.filter(f => {
                                if (f.cabin && f.cabin.toLowerCase() === normalizedCabin) return true;
                                if (f.cabins && f.cabins[normalizedCabin]?.available) return true;
                                return false;
                    });
                    results.airlines[r.code] = { name: r.name, status: 'success', flightCount: flights.length, flights };
                    results.summary.totalFlights += flights.length;
                    flights.forEach(f => {
                                const miles = f.cabins?.[normalizedCabin]?.miles || f.miles;
                                if (miles) results.summary.bestDeals.push({ airline: r.code, miles, cabin: normalizedCabin });
                    });
          }
  });

  results.summary.bestDeals.sort((a, b) => a.miles - b.miles);
      return results;
}

module.exports = { searchAllAirlines, getAirlineList, AIRLINES };
