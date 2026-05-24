const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Route temporaire (à remplacer plus tard)
router.get('/', (req, res) => {
    res.json({ message: 'Route tasks opérationnelle' });
});

router.post('/', (req, res) => {
    res.status(201).json({ message: 'Tâche créée (temporaire)' });
});

module.exports = router;