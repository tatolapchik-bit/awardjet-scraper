const puppeteer = require('puppeteer');

/**
 * Scrape Air France Flying Blue award availability
 */
async function scrapeAirFrance(from, to, date, cabin = 'business') {
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

      console.log(`[AF] Searching ${from} -> ${to} on ${date}`);

      const cabinCode = targetCabin === 'first' ? 'LA PREMIERE' : targetCabin === 'business' ? 'BUSINESS' : 'ECONOMY';
        const url = `https://wwws.airfrance.us/search/offers?pax=1:0:0:0:0:0:0:0&cabinClass=${cabinCode}&activeConnection=0&connections=${from}:A>${to}:A-${date}&bookingFlow=REWARD`;

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

      const flights = await page.evaluate((targetCabin) => {
              const results = [];
              const flightCards = document.querySelectorAll('[class*="flight"], [class*="offer"]');

                                                flightCards.forEach(card => {
                                                          const text = card.innerText;
                                                          const milesMatch = text.match(/([\d,]+)\s*(?:miles|mi)/gi) || [];
                                                          const timeMatches = text.match(/\d{1,2}:\d{2}/gi) || [];

                                                                            if (milesMatch.length > 0) {
                                                                                        const allMiles = milesMatch.map(m => parseInt(m.replace(/[^\d]/g, ''))).filter(m => m > 1000);
                                                                                        if (allMiles.length > 0) {
                                                                                                      allMiles.sort((a, b) => a - b);
                                                                                                      const targetMiles = (targetCabin === 'business' || targetCabin === 'first') ? allMiles[allMiles.length - 1] : allMiles[0];
                                                                                                      results.push({
                                                                                                                      airline: 'Air France',
                                                                                                                      airlineCode: 'AF',
                                                                                                                      departureTime: timeMatches[0] || '',
                                                                                                                      arrivalTime: timeMatches[1] || '',
                                                                                                                      cabin: targetCabin,
                                                                                                                      miles: targetMiles,
                                                                                                                      cabins: { [targetCabin]: { miles: targetMiles, available: true } },
                                                                                                                      rawText: text.substring(0, 300)
                                                                                                        });
                                                                                          }
                                                                            }
                                                });
              return results;
      }, targetCabin);

      console.log(`[AF] Found ${flights.length} results`);
        return flights;
  } catch (error) {
        console.error('[AF] Scraping error:', error.message);
        throw error;
  } finally {
        if (browser) await browser.close();
  }
}

module.exports = { scrapeAirFrance };
