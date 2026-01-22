require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { searchAllAirlines, getAirlineList, AIRLINES } = require('./scrapers');
const { initRedis, getCache, setCache, getCacheStats } = require('./services/cache');

const app = express();
const PORT = process.env.PORT || 3002;
const CACHE_TTL = 30;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

app.get('/api', async (req, res) => {
    const cacheStats = await getCacheStats();
    res.json({
          service: 'AwardJet Scraper API',
          version: '2.0.0',
          status: 'operational',
          supportedAirlines: Object.keys(AIRLINES).length,
          cache: cacheStats
    });
});

app.get('/api/airlines', (req, res) => {
    res.json({ count: Object.keys(AIRLINES).length, airlines: getAirlineList() });
});

app.get('/api/cache/stats', async (req, res) => {
    res.json(await getCacheStats());
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/search', async (req, res) => {
    try {
          const { from, to, date, cabin = 'business', airlines, skipCache = false } = req.body;
          if (!from || !to || !date) {
                  return res.status(400).json({ error: 'Missing required fields: from, to, date' });
          }
          const normalizedFrom = from.toUpperCase();
          const normalizedTo = to.toUpperCase();

      if (!skipCache) {
              const cached = await getCache(normalizedFrom, normalizedTo, date, cabin);
              if (cached) {
                        return res.json({ ...cached, cached: true });
              }
      }

      const results = await searchAllAirlines({ from: normalizedFrom, to: normalizedTo, date, cabin, airlines });
          results.timestamp = Date.now();
          results.cached = false;
          await setCache(normalizedFrom, normalizedTo, date, cabin, results, CACHE_TTL);
          res.json(results);
    } catch (error) {
          console.error('Search error:', error);
          res.status(500).json({ error: error.message });
    }
});

app.get('/api/search/:airline', async (req, res) => {
    try {
          const airlineCode = req.params.airline.toUpperCase();
          const { from, to, date, cabin = 'business' } = req.query;
          if (!AIRLINES[airlineCode]) {
                  return res.status(404).json({ error: `Airline ${airlineCode} not supported` });
          }
          if (!from || !to || !date) {
                  return res.status(400).json({ error: 'Missing: from, to, date' });
          }
          const airline = AIRLINES[airlineCode];
          const results = await airline.scraper(from.toUpperCase(), to.toUpperCase(), date, cabin);
          res.json({ airline: airline.name, code: airlineCode, results });
    } catch (error) {
          res.status(500).json({ error: error.message });
    }
});

async function start() {
    await initRedis();
    app.listen(PORT, () => console.log(`AwardJet API running on port ${PORT}`));
}

start();
module.exports = app;
