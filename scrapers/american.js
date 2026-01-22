const puppeteer = require('puppeteer');

async function scrapeAmerican(from, to, date, cabin = 'business') {
    console.log(`[AA] Searching ${from} -> ${to} on ${date}`);

  let browser;
    try {
          browser = await puppeteer.launch({
                  headless: 'new',
                  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
          });

      const page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      const url = `https://www.aa.com/booking/find-flights?locale=en_US&pax=1&adult=1&type=OneWay&searchType=Award&origin=${from}&destination=${to}&departDate=${date}&cabin=${cabin === 'business' ? 'BUSINESS' : 'COACH'}`;

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
          await page.waitForTimeout(3000);

      const flights = await page.evaluate(() => {
              const results = [];
              const flightCards = document.querySelectorAll('[data-testid="flight-card"], .flight-result, .aa-flight-card');

                                                flightCards.forEach(card => {
                                                          try {
                                                                      const milesText = card.textContent.match(/([0-9,]+)\s*miles/i);
                                                                      const priceText = card.textContent.match(/\$([0-9,]+)/);
                                                                      const timeMatch = card.textContent.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/gi);

                                                            if (milesText) {
                                                                          results.push({
                                                                                          miles: parseInt(milesText[1].replace(/,/g, '')),
                                                                                          cash: priceText ? parseFloat(priceText[1].replace(/,/g, '')) : 0,
                                                                                          departure: timeMatch ? timeMatch[0] : 'N/A',
                                                                                          arrival: timeMatch && timeMatch[1] ? timeMatch[1] : 'N/A',
                                                                                          cabin: 'business',
                                                                                          stops: card.textContent.includes('Nonstop') ? 0 : 1
                                                                          });
                                                            }
                                                          } catch (e) {}
                                                });
              return results;
      });

      console.log(`[AA] Found ${flights.length} flights`);
          return flights;

    } catch (error) {
          console.error(`[AA] Error: ${error.message}`);
          return [];
    } finally {
          if (browser) await browser.close();
    }
}

module.exports = { scrapeAmerican };
