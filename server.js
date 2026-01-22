require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { searchAllAirlines, getSupportedAirlines, AIRLINES } = require('./scrapers');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
});

// API status endpoint
app.get('/api', (req, res) => {
      res.json({
              service: 'AwardJet Scraper API',
              version: '2.0.0',
              airlines: Object.keys(AIRLINES).length,
              endpoints: {
                        search: 'POST /api/search',
                        airlines: 'GET /api/airlines'
              }
      });
});

// Get supported airlines
app.get('/api/airlines', (req, res) => {
      const airlines = getSupportedAirlines();
      res.json({
              count: airlines.length,
              airlines: airlines
      });
});

// Search for award flights
app.post('/api/search', async (req, res) => {
      try {
              const { from, to, date, cabin = 'business', airlines } = req.body;

        if (!from || !to || !date) {
                  return res.status(400).json({ 
                                                      error: 'Missing required fields: from, to, date' 
                  });
        }

        console.log(`Search request: ${from} -> ${to} on ${date}, cabin: ${cabin}`);

        const results = await searchAllAirlines({ 
                                                      from, 
                  to, 
                  date, 
                  cabin,
                  airlines: airlines || null
        });

        // Aggregate all flights
        const allFlights = results.flatMap(r => r.flights || []);
              const availableFlights = allFlights.filter(f => f.available);

        res.json({
                  success: true,
                  query: { from, to, date, cabin },
                  summary: {
                              totalAirlines: results.length,
                              successfulSearches: results.filter(r => r.success).length,
                              totalFlights: allFlights.length,
                              availableFlights: availableFlights.length
                  },
                  results: results,
                  flights: availableFlights.sort((a, b) => 
                                                         parseInt(a.miles.replace(/,/g, '')) - parseInt(b.miles.replace(/,/g, ''))
                                                       )
        });
      } catch (error) {
              console.error('Search error:', error);
              res.status(500).json({ error: error.message });
      }
});

// Health check
app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
      console.log(`AwardJet Scraper API running on port ${PORT}`);
      console.log(`Supporting ${Object.keys(AIRLINES).length} airlines`);
});
