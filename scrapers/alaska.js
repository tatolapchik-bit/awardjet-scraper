const puppeteer = require('puppeteer');

async function scrapeAlaska(from, to, date, cabin = 'business') {
    let browser;
    const targetCabin = cabin.toLowerCase();
    const cabinCode = cabin === 'first' ? 'First' : cabin === 'business' ? 'Business' : 'Coach';

  try {
        browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });

      const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

      const url = `https://www.alaskaair.com/shopping/flights?A=1&FT=ow&O=${from}&D=${to}&OD=${date}&ShopType=Award&C=${cabinCode}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

      const flights = await page.evaluate((targetCabin) => {
              const results = [];
              document.querySelectorAll('[class*="flight-card"], [class*="flight-result"]').forEach(card => {
                        const text = card.innerText;
                        const milesMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles|mi)/i);
                        const timeMatches = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/gi) || [];
                        if (milesMatch) {
                                    const miles = parseInt(milesMatch[1].replace(',', ''));
                                    results.push({
                                                  airline: 'Alaska Airlines', airlineCode: 'AS',
                                                  departureTime: timeMatches[0] || '', arrivalTime: timeMatches[1] || '',
                                                  cabin: targetCabin, miles,
                                                  cabins: { [targetCabin]: { miles, available: true } }
                                    });
                        }
              });
              return results;
      }, targetCabin);

      return flights;
  } catch (error) {
        console.error('[AS] Error:', error.message);
        throw error;
  } finally {
        if (browser) await browser.close();
  }
}

module.exports = { scrapeAlaska };
