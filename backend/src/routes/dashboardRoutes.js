const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getDashboardMetrics);

module.exports = router;