// routes/accounts.js
const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const authMiddleware = require('../middleware/auth');

// Alle Konten eines Benutzers abrufen
router.get('/', authMiddleware, async (req, res) => {
    try {
        const accounts = await Account.find({ user: req.user.id });
        res.json(accounts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Neues Konto erstellen
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, type, balance, currency, bankApiDetails } = req.body;

        const newAccount = new Account({
            user: req.user.id,
            name,
            type,
            balance,
            currency,
            bankApiDetails
        });

        const account = await newAccount.save();
        res.json(account);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Konto aktualisieren
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, type, balance, currency, bankApiDetails, isActive } = req.body;

        // Prüfen, ob Konto existiert
        let account = await Account.findById(req.params.id);
        if (!account) return res.status(404).json({ message: 'Konto nicht gefunden' });

        // Prüfen, ob Benutzer berechtigt ist
        if (account.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }

        // Konto aktualisieren
        account = await Account.findByIdAndUpdate(
            req.params.id,
            {
                name,
                type,
                balance,
                currency,
                bankApiDetails,
                isActive,
                lastUpdated: Date.now()
            },
            { new: true }
        );

        res.json(account);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Konto löschen
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const account = await Account.findById(req.params.id);

        if (!account) return res.status(404).json({ message: 'Konto nicht gefunden' });

        if (account.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }

        await account.remove();
        res.json({ message: 'Konto entfernt' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Kontostand über Bank-API aktualisieren
router.post('/:id/sync', authMiddleware, async (req, res) => {
    try {
        // Hier würde die Implementierung für die Bank-API-Integration kommen
        // Dies ist ein Platzhalter
        res.json({ message: 'Kontostand-Synchronisierung würde hier implementiert werden' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

module.exports = router;
