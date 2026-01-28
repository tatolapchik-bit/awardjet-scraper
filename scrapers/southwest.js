const puppeteer = require('puppeteer');

/**
 * Scrape Southwest Airlines award availability (Rapid Rewards points)
 * Note: Southwest uses points, not miles
 */
async function scrapeSouthwest(from, to, date, cabin = 'business') {
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

      console.log(`[WN] Searching ${from} → ${to} on ${date}`);

      // Southwest award search URL (points)
      const url = `https://www.southwest.com/air/booking/select.html?originationAirportCode=${from}&destinationAirportCode=${to}&departureDate=${date}&tripType=oneway&passengerType=ADULT&currencyType=POINTS`;

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

      // Southwest has: Wanna Get Away, Anytime, Business Select
      const flights = await page.evaluate((targetCabin) => {
              const results = [];
              const flightCards = document.querySelectorAll('[class*="air-booking-select-flight"], [class*="flight-stops"]');

                                                flightCards.forEach(card => {
                                                          const text = card.innerText;

                                                                            // Southwest uses points
                                                                            const pointsMatch = text.match(/([\d,]+)\s*(?:pts|points)/gi) || [];
                                                          const timeMatches = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/gi) || [];

                                                                            if (pointsMatch.length > 0) {
                                                                                        // Get Business Select price (highest tier)
                                                            const allPoints = pointsMatch.map(p => parseInt(p.replace(/[^\d]/g, ''))).filter(p => p > 100);

                                                            if (allPoints.length > 0) {
                                                                          allPoints.sort((a, b) => a - b);
                                                                          // Business Select is typically highest, Wanna Get Away is lowest
                                                                                          let targetPoints;
                                                                          if (targetCabin === 'business' || targetCabin === 'first') {
                                                                                          targetPoints = allPoints[allPoints.length - 1]; // Business Select
                                                                          } else {
                                                                                          targetPoints = allPoints[0]; // Wanna Get Away
                                                                          }

                                                                                          results.push({
                                                                                                          airline: 'Southwest Airlines',
                                                                                                          airlineCode: 'WN',
                                                                                                          departureTime: timeMatches[0] || '',
                                                                                                          arrivalTime: timeMatches[1] || '',
                                                                                                          cabin: targetCabin === 'business' || targetCabin === 'first' ? 'Business Select' : 'Wanna Get Away',
                                                                                                          miles: targetPoints, // Using miles field for points
                                                                                                          points: targetPoints,
                                                                                                          cabins: {
                                                                                                                            [targetCabin]: { miles: targetPoints, points: targetPoints, available: true }
                                                                                                            },
                                                                                                          rawText: text.substring(0, 300)
                                                                                            });
                                                            }
                                                                            }
                                                });

                                                return results;
      }, targetCabin);

      console.log(`[WN] Found ${flights.length} results`);
        return flights;

  } catch (error) {
        console.error('[WN] Scraping error:', error.message);
        throw error;
  } finally {
        if (browser) await browser.close();
  }
}

module.exports = { scrapeSouthwest };
