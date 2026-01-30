/**
 * American Airlines Award Search Scraper
 * Uses rebrowser-puppeteer-core with patches to bypass anti-bot detection
 * Fixes Runtime.Enable CDP leak that Cloudflare/DataDome detect
 * v4.3.0 - Added retry logic and human-like delays
 */

// Set rebrowser patches environment variables BEFORE requiring
process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE = 'alwaysIsolated';
process.env.REBROWSER_PATCHES_SOURCE_URL = 'app.js';

const puppeteer = require('rebrowser-puppeteer-core');
const chromium = require('@sparticuz/chromium');

const AA_API_URL = 'https://www.aa.com/booking/api/search/itinerary';
const MAX_RETRIES = 3;
const BASE_DELAY = 5000;

// Random delay helper - more human-like
function randomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sleep helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Stealth args for additional anti-detection
const STEALTH_ARGS = [
        ...chromium.args,
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--hide-scrollbars',
        '--mute-audio',
      ];

async function getBrowser() {
        const executablePath = await chromium.executablePath();

  return puppeteer.launch({
            args: STEALTH_ARGS,
            defaultViewport: { width: 1920, height: 1080 },
            executablePath: executablePath,
            headless: 'new',
            ignoreHTTPSErrors: true,
  });
}

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

async function searchAA(query, retryCount = 0) {
        let browser = null;
        try {
                  console.log('Launching rebrowser with anti-detection patches...');
                  browser = await getBrowser();

          const page = await browser.newPage();

          // Set realistic user agent
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

          // Set extra headers to appear more legitimate
          await page.setExtraHTTPHeaders({
                      'Accept-Language': 'en-US,en;q=0.9',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                      'sec-ch-ua-mobile': '?0',
                      'sec-ch-ua-platform': '"Windows"',
          });

          console.log('Navigating to AA website...');
                  await page.goto('https://www.aa.com/booking/find-flights', {
                              waitUntil: 'networkidle2',
                              timeout: 60000
                  });

          // Human-like delay: wait 5-10 seconds before making request
          const waitTime = randomDelay(5000, 10000);
                  console.log(`Waiting ${waitTime}ms to appear human-like...`);
                  await sleep(waitTime);

          // Simulate some mouse movement
          await page.mouse.move(randomDelay(100, 500), randomDelay(100, 300));
                  await sleep(randomDelay(500, 1000));
                  await page.mouse.move(randomDelay(600, 900), randomDelay(400, 600));
                  await sleep(randomDelay(300, 800));

          console.log('Making API request...');
                  const requestBody = buildSearchRequest(query);

          const response = await page.evaluate(async (url, body) => {
                      try {
                                    const res = await fetch(url, {
                                                    method: 'POST',
                                                    headers: {
                                                                      'Content-Type': 'application/json',
                                                                      'Accept': 'application/json',
                                                                      'X-Requested-With': 'XMLHttpRequest'
                                                    },
                                                    body: JSON.stringify(body),
                                                    credentials: 'include'
                                    });
                                    if (!res.ok) return { error: 'HTTP ' + res.status, status: res.status };
                                    return await res.json();
                      } catch (e) {
                                    return { error: e.message };
                      }
          }, AA_API_URL, requestBody);

          await browser.close();
                  browser = null;

          // Handle rate limiting with retry
          if (response.status === 429 && retryCount < MAX_RETRIES) {
                      const backoffDelay = BASE_DELAY * Math.pow(2, retryCount) + randomDelay(1000, 5000);
                      console.log(`Rate limited (429). Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                      await sleep(backoffDelay);
                      return searchAA(query, retryCount + 1);
          }

          // Handle 403 with retry
          if (response.status === 403 && retryCount < MAX_RETRIES) {
                      const backoffDelay = BASE_DELAY * Math.pow(2, retryCount) + randomDelay(2000, 8000);
                      console.log(`Blocked (403). Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                      await sleep(backoffDelay);
                      return searchAA(query, retryCount + 1);
          }

          if (response.error) {
                      throw new Error(response.error);
          }

          const flights = parseFlightResults(response);
                  console.log(`Found ${flights.length} flights`);
                  return flights;

        } catch (error) {
                  console.error('Search error:', error.message);

          // Retry on general errors
          if (retryCount < MAX_RETRIES) {
                      const backoffDelay = BASE_DELAY * Math.pow(2, retryCount);
                      console.log(`Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                      await sleep(backoffDelay);
                      if (browser) await browser.close();
                      return searchAA(query, retryCount + 1);
          }

          throw error;
        } finally {
                  if (browser) {
                              await browser.close();
                  }
        }
}

module.exports = { searchAA };
