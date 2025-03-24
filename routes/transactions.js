// routes/transactions.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const authMiddleware = require('../middleware/auth');

// Alle Transaktionen eines Kontos abrufen
router.get('/account/:accountId', authMiddleware, async (req, res) => {
    try {
        const account = await Account.findById(req.params.accountId);

        // Prüfen, ob Konto existiert und Benutzer berechtigt ist
        if (!account) return res.status(404).json({ message: 'Konto nicht gefunden' });
        if (account.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }

        const transactions = await Transaction.find({ account: req.params.accountId })
                                             .sort({ date: -1 });
        res.json(transactions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Neue Transaktion erstellen
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { account: accountId, amount, description, category, date, type, transferTo } = req.body;

        // Konto prüfen
        const account = await Account.findById(accountId);
        if (!account) return res.status(404).json({ message: 'Konto nicht gefunden' });
        if (account.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }

        // Neue Transaktion erstellen
        const newTransaction = new Transaction({
            account: accountId,
            amount,
            description,
            category,
            date: date || Date.now(),
            type,
            transferTo
        });

        // Kontostand aktualisieren
        let balanceChange = amount;
        if (type === 'Ausgabe') {
            balanceChange = -amount;
        }

        account.balance += balanceChange;
        account.lastUpdated = Date.now();

        // Bei Transfer auch Zielkonto aktualisieren
        if (type === 'Transfer' && transferTo) {
            const targetAccount = await Account.findById(transferTo);
            if (targetAccount && targetAccount.user.toString() === req.user.id) {
                targetAccount.balance += amount;
                targetAccount.lastUpdated = Date.now();
                await targetAccount.save();
            }
        }

        // Speichern
        await account.save();
        const transaction = await newTransaction.save();

        res.json(transaction);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Transaktion aktualisieren
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { amount, description, category, date, type } = req.body;

        // Transaktion finden
        let transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Transaktion nicht gefunden' });

        // Konto prüfen
        const account = await Account.findById(transaction.account);
        if (account.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }

        // Kontostand anpassen (alte Transaktion rückgängig machen)
        let oldBalanceChange = transaction.amount;
        if (transaction.type === 'Ausgabe') {
            oldBalanceChange = -transaction.amount;
        }
        account.balance -= oldBalanceChange;

        // Transaktion aktualisieren
        transaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            { amount, description, category, date, type },
            { new: true }
        );

        // Neuen Kontostand berechnen
        let newBalanceChange = amount;
        if (type === 'Ausgabe') {
            newBalanceChange = -amount;
        }
        account.balance += newBalanceChange;
        account.lastUpdated = Date.now();

        await account.save();

        res.json(transaction);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

// Transaktion löschen
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Transaktion nicht gefunden' });

        // Konto prüfen
        const account = await Account.findById(transaction.account);
        if (account.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }

        // Kontostand anpassen
        let balanceChange = transaction.amount;
        if (transaction.type === 'Ausgabe') {
            balanceChange = -transaction.amount;
        }
        account.balance -= balanceChange;
        account.lastUpdated = Date.now();
        await account.save();

        // Transaktion löschen
        await transaction.remove();

        res.json({ message: 'Transaktion entfernt' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Fehler');
    }
});

module.exports = router;