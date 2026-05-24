// backend/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre de la tâche est requis'],
        trim: true,
        maxlength: [200, 'Le titre ne peut pas dépasser 200 caractères']
    },
    description: {
        type: String,
        maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères'],
        default: ''
    },
    priority: {
        type: String,
        enum: ['basse', 'moyenne', 'haute'],
        required: true,
        default: 'moyenne'
    },
    status: {
        type: String,
        enum: ['à faire', 'en cours', 'terminé'],
        required: true,
        default: 'à faire'
    },
    deadline: {
        type: Date,
        default: null
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'La tâche doit être associée à un projet']
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index pour les recherches efficaces
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);