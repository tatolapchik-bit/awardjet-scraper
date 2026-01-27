const puppeteer = require('puppeteer');

const DELTA_CABIN_MAP = {
    'economy': 'MAIN',
    'premium': 'PREM',
    'business': 'BUS',
    'first': 'FIRST'
};

const DELTA_CABIN_NAMES = {
    'economy': ['main cabin', 'economy', 'basic economy'],
    'premium': ['premium select', 'comfort+', 'delta comfort'],
    'business': ['delta one', 'business'],
    'first': ['first', 'first class']
};

async function scrapeDelta(from, to, date, cabin = 'business') {
    let browser;
    const targetCabin = cabin.toLowerCase();

  try {
        browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });

      const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

      console.log(`[DL] Searching ${from} to ${to} on ${date} (${cabin} class)`);

      const cabinCode = DELTA_CABIN_MAP[targetCabin] || 'BUS';
        const searchUrl = `https://www.delta.com/flight-search/book-a-flight?action=findFlights&tripType=ONE_WAY&originCity=${from}&destinationCity=${to}&departureDate=${date}&passengers=1&fareClass=${cabinCode}&awardTravel=true`;

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

      const cabinNames = DELTA_CABIN_NAMES[targetCabin] || DELTA_CABIN_NAMES['business'];

      const flights = await page.evaluate((targetCabin, cabinNames) => {
              const results = [];
              const flightCards = document.querySelectorAll('[class*="flight-card"], [class*="itinerary"], [class*="slice"]');

                                                flightCards.forEach(card => {
                                                          try {
                                                                      const text = card.innerText.toLowerCase();
                                                                      const fullText = card.innerText;
                                                                      const timeMatches = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/gi) || [];
                                                                      const durationMatch = fullText.match(/(\d+h\s*\d*m?)/i);

                                                            let cabinMiles = null;
                                                                      const milesMatches = fullText.match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles|mi)/gi) || [];
                                                                      const allMiles = milesMatches.map(m => parseInt(m.replace(/[^\d]/g, ''))).filter(m => m > 1000);

                                                            if (allMiles.length > 0) {
                                                                          allMiles.sort((a, b) => a - b);
                                                                          cabinMiles = (targetCabin === 'business' || targetCabin === 'first') ? allMiles[allMiles.length - 1] : allMiles[0];
                                                            }

                                                            if (cabinMiles && timeMatches.length >= 2) {
                                                                          results.push({
                                                                                          airline: 'Delta Air Lines',
                                                                                          airlineCode: 'DL',
                                                                                          departureTime: timeMatches[0],
                                                                                          arrivalTime: timeMatches[1],
                                                                                          duration: durationMatch ? durationMatch[1] : '',
                                                                                          cabin: targetCabin,
                                                                                          cabins: { [targetCabin]: { miles: cabinMiles, available: true } },
                                                                                          miles: cabinMiles
                                                                          });
                                                            }
                                                          } catch (e) {}
                                                });
              return results;
      }, targetCabin, cabinNames);

      console.log(`[DL] Found ${flights.length} ${cabin} class flights`);
        return flights;

  } catch (error) {
        console.error('[DL] Scraping error:', error.message);
        throw error;
  } finally {
        if (browser) await browser.close();
  }
}

module.exports = { scrapeDelta };
