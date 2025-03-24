// models/Transaction.js
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Lebensmittel', 'Wohnen', 'Transport', 'Unterhaltung', 'Gesundheit', 'Bildung', 'Einkommen', 'Sonstiges'],
        default: 'Sonstiges'
    },
    date: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['Einnahme', 'Ausgabe', 'Transfer'],
        required: true
    },
    // Für Transfers zwischen eigenen Konten
    transferTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);