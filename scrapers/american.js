/**
 * American Airlines Award Search Scraper
 * Uses Puppeteer with stealth mode to bypass anti-bot detection
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const AA_API_URL = 'https://www.aa.com/booking/api/search/itinerary';

const STEALTH_ARGS = [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920,1080'
          ];

function buildSearchRequest(query) {
            return {
                          metadata: { selectedProducts: [], tripType: 'OneWay', udo: {} },
                          passengers: [{ type: 'adult', count: 1 }],
                          queryParams: { sliceIndex: 0, sessionId: '', solutionId: '', solutionSet: '' },
                          requestHeader: { clientId: 'AAcom' },
                          slices: [{
                                          allCarriers: true,
                                          cabin: '',
                                          departureDate: query.departureDate,
                                          destination: query.destination,
                                          origin: query.origin,
                                          departureTime: '040001'
                          }],
                          tripOptions: { locale: 'en_US', searchType: 'Award' },
                          loyaltyInfo: null
            };
}

function parseFlightResults(data) {
            const flights = [];
            if (!data?.slices?.[0]?.sliceSolutions) return flights;

  for (const solution of data.slices[0].sliceSolutions) {
                const segments = solution.segments || [];
                const firstSeg = segments[0] || {};
                const lastSeg = segments[segments.length - 1] || {};

              for (const pricing of (solution.perPassengerPrices || [])) {
                              const miles = pricing.totalMiles || 0;
                              const seats = pricing.seatsRemaining || 0;

                  if (miles > 0 && seats > 0) {
                                    flights.push({
                                                        airline: 'AA',
                                                        flightNumber: 'AA' + (firstSeg.flightNumber || ''),
                                                        origin: firstSeg.origin?.code || '',
                                                        destination: lastSeg.destination?.code || '',
                                                        departureTime: firstSeg.departureDateTime || '',
                                                        arrivalTime: lastSeg.arrivalDateTime || '',
                                                        stops: segments.length - 1,
                                                        cabin: pricing.cabin || 'economy',
                                                        miles: miles,
                                                        taxes: pricing.taxes?.amount || 0,
                                                        seatsAvailable: seats
                                    });
                  }
              }
  }
            return flights;
}

async function searchAA(query) {
            let browser = null;
            try {
                          browser = await puppeteer.launch({ headless: 'new', args: STEALTH_ARGS });
                          const page = await browser.newPage();
                          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

              await page.goto('https://www.aa.com/booking/find-flights', { waitUntil: 'networkidle2', timeout: 30000 });
                          await new Promise(r => setTimeout(r, 2000));

              const requestBody = buildSearchRequest(query);
                          const response = await page.evaluate(async (url, body) => {
                                          try {
                                                            const res = await fetch(url, {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                                                                                body: JSON.stringify(body),
                                                                                credentials: 'include'
                                                            });
                                                            if (!res.ok) return { error: 'HTTP ' + res.status };
                                                            return await res.json();
                                          } catch (e) { return { error: e.message }; }
                          }, AA_API_URL, requestBody);

              await browser.close();
                          if (response.error) throw new Error(response.error);
                          return parseFlightResults(response);
            } finally {
                          if (browser) await browser.close();
            }
}

module.exports = { searchAA };
