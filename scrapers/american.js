/**
 * American Airlines Award Search Scraper
 * Uses rebrowser-puppeteer-core with patches to bypass anti-bot detection
 * Fixes Runtime.Enable CDP leak that Cloudflare/DataDome detect
 */

// Set rebrowser patches environment variables BEFORE requiring
process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE = 'alwaysIsolated';
process.env.REBROWSER_PATCHES_SOURCE_URL = 'app.js';

const puppeteer = require('rebrowser-puppeteer-core');
const chromium = require('@sparticuz/chromium');

const AA_API_URL = 'https://www.aa.com/booking/api/search/itinerary';

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

async function searchAA(query) {
      let browser = null;
      try {
              console.log('Launching rebrowser with anti-detection patches...');
              browser = await getBrowser();

        const page = await browser.newPage();

        // Set realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Set extra headers
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
                        timeout: 45000
              });

        // Wait for page to establish session
        await new Promise(r => setTimeout(r, 3000));

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
                              if (!res.ok) return { error: 'HTTP ' + res.status };
                              return await res.json();
                  } catch (e) {
                              return { error: e.message };
                  }
        }, AA_API_URL, requestBody);

        await browser.close();
              browser = null;

        if (response.error) {
                  throw new Error(response.error);
        }

        const flights = parseFlightResults(response);
              console.log('Found ' + flights.length + ' flights');
              return flights;

      } catch (error) {
              console.error('Search error:', error.message);
              throw error;
      } finally {
              if (browser) {
                        await browser.close();
              }
      }
}

module.exports = { searchAA };
