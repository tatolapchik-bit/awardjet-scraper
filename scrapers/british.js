const puppeteer = require('puppeteer');

/**
 * Scrape British Airways Executive Club award availability (Avios)
 */
async function scrapeBritish(from, to, date, cabin = 'business') {
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

      console.log(`[BA] Searching ${from} -> ${to} on ${date}`);

      // British Airways award search
      const cabinCode = targetCabin === 'first' ? 'F' : targetCabin === 'business' ? 'J' : targetCabin === 'premium' ? 'W' : 'M';
        const url = `https://www.britishairways.com/travel/redeem/execclub/_gf/en_us?eId=111021&tab_selected=redeem&departure=${from}&arrival=${to}&departureDate=${date}&cabin=${cabinCode}&ADession=1&numPax=1`;

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

      const flights = await page.evaluate((targetCabin) => {
              const results = [];
              const flightCards = document.querySelectorAll('[class*="flight"], [class*="journey"], [class*="result"]');

                                                flightCards.forEach(card => {
                                                          const text = card.innerText;
                                                          const aviosMatch = text.match(/([\d,]+)\s*(?:avios|points)/gi) || [];
                                                          const timeMatches = text.match(/\d{1,2}:\d{2}/gi) || [];

                                                                            if (aviosMatch.length > 0) {
                                                                                        const allAvios = aviosMatch.map(a => parseInt(a.replace(/[^\d]/g, ''))).filter(a => a > 1000);

                                                            if (allAvios.length > 0) {
                                                                          allAvios.sort((a, b) => a - b);
                                                                          let targetAvios;
                                                                          if (targetCabin === 'business' || targetCabin === 'first') {
                                                                                          targetAvios = allAvios[allAvios.length - 1];
                                                                          } else {
                                                                                          targetAvios = allAvios[0];
                                                                          }

                                                                                          results.push({
                                                                                                          airline: 'British Airways',
                                                                                                          airlineCode: 'BA',
                                                                                                          departureTime: timeMatches[0] || '',
                                                                                                          arrivalTime: timeMatches[1] || '',
                                                                                                          cabin: targetCabin,
                                                                                                          miles: targetAvios,
                                                                                                          avios: targetAvios,
                                                                                                          cabins: {
                                                                                                                            [targetCabin]: { miles: targetAvios, avios: targetAvios, available: true }
                                                                                                            },
                                                                                                          rawText: text.substring(0, 300)
                                                                                            });
                                                            }
                                                                            }
                                                });

                                                return results;
      }, targetCabin);

      console.log(`[BA] Found ${flights.length} results`);
        return flights;

  } catch (error) {
        console.error('[BA] Scraping error:', error.message);
        throw error;
  } finally {
        if (browser) await browser.close();
  }
}

module.exports = { scrapeBritish };
