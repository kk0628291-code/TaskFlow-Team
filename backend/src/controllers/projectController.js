const Project = require('../models/Project');

// Créer un projet
const createProject = async (req, res) => {
    try {
        const { title, description, dueDate, status } = req.body;
        const project = new Project({
            title,
            description,
            dueDate,
            status,
            owner: req.user.userId
        });
        await project.save();
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer tous les projets (paginé)
const getProjects = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        const projects = await Project.find({ owner: req.user.userId })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Project.countDocuments({ owner: req.user.userId });

        res.json({
            data: projects,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer un projet par ID
const getProjectById = async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });
        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Modifier un projet
const updateProject = async (req, res) => {
    try {
        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, owner: req.user.userId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Supprimer un projet
const deleteProject = async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });
        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        await project.deleteOne();
        res.json({ message: 'Projet supprimé avec ses tâches' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject
};