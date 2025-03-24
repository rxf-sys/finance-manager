// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Benutzer registrieren
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Prüfen, ob Benutzer bereits existiert
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'Benutzer existiert bereits' });
        }

        // Neuen Benutzer erstellen
        user = new User({
            username,
            email,
            password
        });

        await user.save();

        // JWT Token erstellen
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Benutzer anmelden
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Benutzer finden
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Ungültige Anmeldedaten' });
        }

        // Passwort überprüfen
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Ungültige Anmeldedaten' });
        }

        // JWT Token erstellen
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Aktuellen Benutzer abrufen
router.get('/user', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

module.exports = router;