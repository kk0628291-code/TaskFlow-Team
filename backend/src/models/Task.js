const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre est requis'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    priority: {
        type: String,
        enum: ['basse', 'moyenne', 'haute'],
        default: 'moyenne'
    },
    status: {
        type: String,
        enum: ['à faire', 'en cours', 'terminé'],
        default: 'à faire'
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'Le projet est requis']
    },
    // 👈 Champ pour l'assignation (F4)
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    dueDate: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);
