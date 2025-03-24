// models/Account.js
const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Girokonto', 'Sparkonto', 'Kreditkarte', 'Bar', 'Sonstiges'],
        default: 'Girokonto'
    },
    balance: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'EUR'
    },
    bankApiDetails: {
        apiKey: String,
        accountId: String,
        provider: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Account', AccountSchema);