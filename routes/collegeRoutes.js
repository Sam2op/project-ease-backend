const express = require('express');
const router = express.Router();
const colleges = require('../data/colleges');

router.get('/', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      colleges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

module.exports = router;
