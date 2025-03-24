// app.js - Hauptanwendungsdatei
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Routen importieren
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const goalRoutes = require('./routes/goals');

// App initialisieren
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

// Datenbankverbindung
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB verbunden'))
.catch(err => {
    console.error('Fehler bei MongoDB-Verbindung:', err.message);
    process.exit(1);
});

// Routen einbinden
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalRoutes);

// Hauptroute - Sendet die SPA (Single Page Application)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));