const puppeteer = require('puppeteer');

async function scrapeJetBlue(from, to, date, cabin = 'business') {
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

      const url = `https://www.jetblue.com/booking/flights?from=${from}&to=${to}&depart=${date}&is498498Award=true`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

      const flights = await page.evaluate((targetCabin) => {
              const results = [];
              document.querySelectorAll('[class*="flight"], [class*="card"]').forEach(el => {
                        const text = el.innerText;
                        const pointsMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*points?/i);
                        const timeMatches = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi) || [];
                        if (pointsMatch) {
                                    const miles = parseInt(pointsMatch[1].replace(',', ''));
                                    results.push({
                                                  airline: 'JetBlue', airlineCode: 'B6',
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
        console.error('[B6] Error:', error.message);
        throw error;
  } finally {
        if (browser) await browser.close();
  }
}

module.exports = { scrapeJetBlue };
