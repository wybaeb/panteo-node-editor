const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Path to store editor data
const DATA_FILE = path.join(__dirname, '../../data/editor-data.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize with empty data if file doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ nodes: [], edges: [] }));
}

// Get editor data
router.get('/', (req, res) => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading editor data:', error);
    res.status(500).json({
      error: 'Failed to read editor data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }
});

// Save editor data
router.post('/', (req, res) => {
  try {
    // Validate request body
    if (!req.body || !req.body.nodes || !Array.isArray(req.body.nodes) || 
        !req.body.edges || !Array.isArray(req.body.edges)) {
      return res.status(400).json({
        error: 'Invalid data format',
        message: 'Request must include nodes and edges arrays'
      });
    }
    
    // Save data to file
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
    
    res.json({ success: true, message: 'Editor data saved successfully' });
  } catch (error) {
    console.error('Error saving editor data:', error);
    res.status(500).json({
      error: 'Failed to save editor data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }
});

module.exports = router;
