require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { searchAA } = require('./scrapers/american');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
        res.json({ status: 'ok', version: '4.0.0', method: 'puppeteer-stealth' });
});

// Search endpoint
app.get('/api/search', async (req, res) => {
        const { origin, destination, date, cabin } = req.query;

          if (!origin || !destination || !date) {
                    return res.status(400).json({
                                error: 'Missing required parameters: origin, destination, date'
                    });
          }

          console.log(`Searching: ${origin} -> ${destination} on ${date}`);

          try {
                    const results = await searchAA({
                                origin: origin.toUpperCase(),
                                destination: destination.toUpperCase(),
                                departureDate: date,
                                cabin: cabin || 'economy'
                    });

          res.json({
                      success: true,
                      source: 'American Airlines',
                      query: { origin, destination, date, cabin },
                      results
          });
          } catch (error) {
                    console.error('Search error:', error);
                    res.status(500).json({
                                success: false,
                                error: error.message,
                                details: 'Failed to fetch award availability'
                    });
          }
});

// Multi-airline search
app.post('/api/search', async (req, res) => {
        const { origin, destination, departureDate, cabin, airlines } = req.body;

           if (!origin || !destination || !departureDate) {
                     return res.status(400).json({
                                 error: 'Missing required parameters'
                     });
           }

           console.log(`Multi-search: ${origin} -> ${destination} on ${departureDate}`);

           try {
                     const results = await searchAA({
                                 origin: origin.toUpperCase(),
                                 destination: destination.toUpperCase(),
                                 departureDate,
                                 cabin: cabin || 'economy'
                     });

          res.json({
                      success: true,
                      query: { origin, destination, departureDate, cabin },
                      results: {
                                    AA: results
                      }
          });
           } catch (error) {
                     console.error('Search error:', error);
                     res.status(500).json({
                                 success: false,
                                 error: error.message
                     });
           }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
        console.log(`AwardJet API running on port ${PORT}`);
        console.log('Using Puppeteer stealth mode for scraping');
});
