const express = require('express');
const router = express.Router();
const ungatingService = require('../services/ungatingService');

// POST /api/ungating/scan/start
// Démarre un nouveau scan avec les paramètres fournis
router.post('/scan/start', async (req, res) => {
  try {
    const { maxPrice, cats } = req.body;

    if (!maxPrice || !cats || !Array.isArray(cats)) {
      return res.status(400).json({
        error: 'Invalid parameters. Required: maxPrice (number), cats (array)'
      });
    }

    const io = req.app.get('io');
    const result = await ungatingService.startScan(maxPrice, cats, io);

    res.json(result);
  } catch (error) {
    console.error('Error starting scan:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ungating/scan/:scanId/progress
// Récupère la progression d'un scan
router.get('/scan/:scanId/progress', async (req, res) => {
  try {
    const { scanId } = req.params;
    const progress = await ungatingService.getScanProgress(scanId);

    if (!progress) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error getting scan progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ungating/scan/:scanId/results
// Récupère les résultats d'un scan terminé
router.get('/scan/:scanId/results', async (req, res) => {
  try {
    const { scanId } = req.params;
    const results = await ungatingService.getScanResults(scanId);

    if (!results) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json(results);
  } catch (error) {
    console.error('Error getting scan results:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
