// routes/goals.js
const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const authMiddleware = require('../middleware/auth');

// Alle Ziele eines Benutzers abrufen
router.get('/', authMiddleware, async (req, res) => {
    try {
        const goals = await Goal.find({ user: req.user.id });
        res.json(goals);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Neues Ziel erstellen
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, targetAmount, currentAmount, currency, deadline, category } = req.body;

        const newGoal = new Goal({
            user: req.user.id,
            name,
            targetAmount,
            currentAmount: currentAmount || 0,
            currency,
            deadline,
            category
        });

        const goal = await newGoal.save();
        res.json(goal);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Ziel aktualisieren
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, targetAmount, currentAmount, currency, deadline, category, isCompleted } = req.body;

        // Prüfen, ob Ziel existiert
        let goal = await Goal.findById(req.params.id);
        if (!goal) return res.status(404).json({ message: 'Ziel nicht gefunden' });

        // Prüfen, ob Benutzer berechtigt ist
        if (goal.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }

        // Ziel aktualisieren
        goal = await Goal.findByIdAndUpdate(
            req.params.id,
            {
                name,
                targetAmount,
                currentAmount,
                currency,
                deadline,
                category,
                isCompleted: isCompleted || (currentAmount >= targetAmount)
            },
            { new: true }
        );

        res.json(goal);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Ziel löschen
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);

        if (!goal) return res.status(404).json({ message: 'Ziel nicht gefunden' });

        if (goal.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }

        await goal.remove();
        res.json({ message: 'Ziel entfernt' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

module.exports = router;