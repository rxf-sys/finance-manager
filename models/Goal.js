// models/Goal.js
const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    targetAmount: {
        type: Number,
        required: true
    },
    currentAmount: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'EUR'
    },
    deadline: {
        type: Date
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    category: {
        type: String,
        enum: ['Urlaub', 'Auto', 'Haus', 'Bildung', 'Notfall', 'Ruhestand', 'Sonstiges'],
        default: 'Sonstiges'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Goal', GoalSchema);