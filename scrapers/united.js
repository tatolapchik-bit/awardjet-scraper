const puppeteer = require('puppeteer');

const UA_CABIN_MAP = { 'economy': '1', 'premium': '2', 'business': '2', 'first': '3' };

async function scrapeUnited(from, to, date, cabin = 'business') {
    let browser;
    const targetCabin = cabin.toLowerCase();
    const cabinCode = UA_CABIN_MAP[targetCabin] || '2';

  try {
        browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });

      const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

      const searchUrl = `https://www.united.com/en/us/fsr/choose-flights?f=${from}&t=${to}&d=${date}&tt=1&at=1&sc=${cabinCode}&px=1`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

      const flights = await page.evaluate((targetCabin) => {
              const results = [];
              document.querySelectorAll('[class*="flight"], [class*="segment"]').forEach(el => {
                        const text = el.innerText;
                        const milesMatches = text.match(/(\d{1,3}(?:,\d{3})*)\s*miles?/gi) || [];
                        const timeMatches = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi) || [];
                        if (milesMatches.length > 0) {
                                    const miles = parseInt(milesMatches[0].replace(/[^\d]/g, ''));
                                    if (miles > 1000) {
                                                  results.push({
                                                                  airline: 'United Airlines', airlineCode: 'UA',
                                                                  departureTime: timeMatches[0] || '', arrivalTime: timeMatches[1] || '',
                                                                  cabin: targetCabin, miles,
                                                                  cabins: { [targetCabin]: { miles, available: true } }
                                                  });
                                    }
                        }
              });
              return results;
      }, targetCabin);

      return flights;
  } catch (error) {
        console.error('[UA] Error:', error.message);
        throw error;
  } finally {
        if (browser) await browser.close();
  }
}

module.exports = { scrapeUnited };
