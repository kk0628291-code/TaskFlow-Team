require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connecté à MongoDB'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));

const authRoutes = require('./src/routes/authRoutes');
const projectRoutes = require('./src/routes/projectRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes'); // 👈 NOUVEAU

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes); // 👈 NOUVEAU

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Serveur fonctionne' });
});

app.use((req, res) => {
    res.status(404).json({ message: 'Route non trouvée' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur sur http://localhost:${PORT}`);
});