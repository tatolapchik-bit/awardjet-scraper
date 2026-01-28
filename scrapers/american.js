const puppeteer = require('puppeteer');

const AA_CABIN_MAP = {
        'economy': 'ECONOMY',
        'premium': 'PREMIUM_ECONOMY', 
        'business': 'BUSINESS',
        'first': 'FIRST'
};

async function scrapeAmerican(from, to, date, cabin = 'business') {
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

          console.log(`[AA] Searching ${from} to ${to} on ${date} (${cabin} class)`);

          await page.goto('https://www.aa.com/booking/find-flights', {
                      waitUntil: 'networkidle2',
                      timeout: 30000
          });

          await page.waitForSelector('input[name="origin"]', { timeout: 10000 });
            await page.click('input[name="origin"]');
            await page.type('input[name="origin"]', from, { delay: 50 });
            await page.keyboard.press('Tab');
            await new Promise(r => setTimeout(r, 500));

          await page.click('input[name="destination"]');
            await page.type('input[name="destination"]', to, { delay: 50 });
            await page.keyboard.press('Tab');
            await new Promise(r => setTimeout(r, 500));

          const [year, month, day] = date.split('-');
            const formattedDate = `${month}/${day}/${year}`;
            const departInput = await page.$('input[name="departDate"]');
            await departInput.click({ clickCount: 3 });
            await departInput.type(formattedDate);

          const redeemMilesCheckbox = await page.$('input[name="awardBooking"]');
            if (redeemMilesCheckbox) {
                        const isChecked = await page.evaluate(el => el.checked, redeemMilesCheckbox);
                        if (!isChecked) await redeemMilesCheckbox.click();
            }

          await page.click('button[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
            await new Promise(r => setTimeout(r, 3000));

          const flights = await page.evaluate((targetCabin) => {
                      const results = [];
                      const flightRows = document.querySelectorAll('.flight-row, .aa-flight-result, [class*="flight-result"]');

                                                    flightRows.forEach(row => {
                                                                  try {
                                                                                  const text = row.innerText;
                                                                                  const timeMatches = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/gi) || [];
                                                                                  const milesMatches = text.match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles|mi)/gi) || [];
                                                                                  const allMiles = milesMatches.map(m => parseInt(m.replace(/[^\d]/g, ''))).filter(m => m > 1000);

                                                                    if (allMiles.length > 0 && timeMatches.length >= 2) {
                                                                                      allMiles.sort((a, b) => a - b);
                                                                                      const miles = (targetCabin === 'business' || targetCabin === 'first') ? allMiles[allMiles.length - 1] : allMiles[0];
                                                                                      results.push({
                                                                                                          airline: 'American Airlines',
                                                                                                          airlineCode: 'AA',
                                                                                                          departureTime: timeMatches[0],
                                                                                                          arrivalTime: timeMatches[1],
                                                                                                          cabin: targetCabin,
                                                                                                          miles: miles,
                                                                                                          cabins: { [targetCabin]: { miles: miles, available: true } }
                                                                                            });
                                                                    }
                                                                  } catch (e) {}
                                                    });
                      return results;
          }, targetCabin);

          console.log(`[AA] Found ${flights.length} ${cabin} class flights`);
            return flights;

  } catch (error) {
            console.error('[AA] Scraping error:', error.message);
            throw error;
  } finally {
            if (browser) await browser.close();
  }
}

module.exports = { scrapeAmerican };
