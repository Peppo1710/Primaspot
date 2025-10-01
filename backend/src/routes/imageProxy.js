const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Endpoint to download and save images
router.post('/proxy-image', async (req, res) => {
  try {
    const { imageUrl, filename, folder } = req.body;

    if (!imageUrl || !filename || !folder) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: imageUrl, filename, folder'
      });
    }

    // Define base directory (frontend public folder)
    const baseDir = path.join(__dirname, '../../../frontend/public/images', folder);
    
    // Ensure directory exists
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const outputPath = path.join(baseDir, filename);
    const localPath = `/images/${folder}/${filename}`;

    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      return res.json({
        success: true,
        localPath,
        message: 'Image already exists'
      });
    }

    // Download image
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Save to file
    fs.writeFileSync(outputPath, response.data);

    res.json({
      success: true,
      localPath,
      message: 'Image downloaded successfully'
    });

  } catch (error) {
    console.error('Image proxy error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to download image',
      error: error.message
    });
  }
});

module.exports = router;

