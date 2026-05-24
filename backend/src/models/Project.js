const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre est requis'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    dueDate: {
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
    }
}, {
    timestamps: true
});

// Suppression en cascade
projectSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    const Task = mongoose.model('Task');
    await Task.deleteMany({ project: this._id });
    next();
});

module.exports = mongoose.model('Project', projectSchema);