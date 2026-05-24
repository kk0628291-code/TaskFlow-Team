// backend/models/Project.js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre est requis'],
        trim: true,
        maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
    },
    description: {
        type: String,
        maxlength: [500, 'La description ne peut pas dépasser 500 caractères'],
        default: ''
    },
    deadline: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['actif', 'en pause', 'archivé'],
        default: 'actif'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Middleware pour la suppression en cascade des tâches
projectSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    const Task = mongoose.model('Task');
    await Task.deleteMany({ project: this._id });
    next();
});

// Pour la suppression via findOneAndDelete
projectSchema.pre('findOneAndDelete', async function(next) {
    const projectId = this.getQuery()._id;
    const Task = mongoose.model('Task');
    await Task.deleteMany({ project: projectId });
    next();
});

module.exports = mongoose.model('Project', projectSchema);