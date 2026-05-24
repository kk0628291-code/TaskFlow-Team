const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

// ============================================
// CRÉER UNE TÂCHE (AVEC ASSIGNATION)
// ============================================
const createTask = async (req, res) => {
    try {
        const { title, description, priority, status, project, assignedTo, dueDate } = req.body;

        const projectDoc = await Project.findById(project);
        if (!projectDoc) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }

        if (projectDoc.owner.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Seul le créateur peut ajouter des tâches' });
        }

        const task = new Task({ title, description, priority, status, project, assignedTo, dueDate });
        await task.save();

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'fullName email');

        res.status(201).json(populatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============================================
// SUPPRIMER UNE TÂCHE
// ============================================
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Tâche non trouvée' });

        const project = await Project.findById(task.project);
        if (project.owner.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        await task.deleteOne();
        res.json({ message: 'Tâche supprimée' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============================================
// RÉCUPÉRER LES TÂCHES (FILTRÉES PAR MEMBRE)
// ============================================
const getTasks = async (req, res) => {
    try {
        const { projectId, status, priority, page = 1, limit = 10 } = req.query;
        let filter = {};

        if (projectId) {
            filter.project = projectId;

            const project = await Project.findById(projectId);
            if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

            const isOwner = project.owner.toString() === req.user.userId;
            const isMember = project.members.some(m => m.toString() === req.user.userId);

            if (!isOwner && isMember) {
                filter.assignedTo = req.user.userId;
            } else if (!isOwner && !isMember) {
                return res.status(403).json({ message: 'Accès non autorisé' });
            }
        }

        if (status) filter.status = status;
        if (priority) filter.priority = priority;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const tasks = await Task.find(filter)
            .populate('assignedTo', 'fullName email')
            .populate('project', 'title')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Task.countDocuments(filter);

        res.json({
            data: tasks,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============================================
// METTRE À JOUR LE STATUT (MEMBRE ASSIGNÉ)
// ============================================
const updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['à faire', 'en cours', 'terminé'].includes(status)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }

        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Tâche non trouvée' });

        const project = await Project.findById(task.project);
        const isOwner = project.owner.toString() === req.user.userId;
        const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user.userId;

        if (!isOwner && !isAssigned) {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        task.status = status;
        await task.save();
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============================================
// RÉCUPÉRER LES MEMBRES D'UN PROJET
// ============================================
const getProjectMembers = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId)
            .populate('owner', 'fullName email _id')
            .populate('members', 'fullName email _id');

        if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

        const isOwner = project.owner && project.owner._id.toString() === req.user.userId;
        const isMember = project.members.some(m => m._id.toString() === req.user.userId);

        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        res.json({
            owner: {
                _id: project.owner._id,
                fullName: project.owner.fullName,
                email: project.owner.email
            },
            members: project.members.map(m => ({
                _id: m._id,
                fullName: m.fullName,
                email: m.email
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============================================
// AJOUTER UN MEMBRE À UN PROJET
// ============================================
const addMember = async (req, res) => {
    try {
        const { email } = req.body;
        const projectId = req.params.projectId;

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

        if (project.owner.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

        if (project.members.includes(user._id)) {
            return res.status(400).json({ message: 'Déjà membre' });
        }

        if (project.owner.toString() === user._id.toString()) {
            return res.status(400).json({ message: 'Le propriétaire est déjà membre' });
        }

        project.members.push(user._id);
        await project.save();

        res.json({ message: 'Membre ajouté', member: { _id: user._id, fullName: user.fullName, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============================================
// RETIRER UN MEMBRE D'UN PROJET
// ============================================
const removeMember = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const memberId = req.params.memberId;

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

        if (project.owner.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        if (!project.members.includes(memberId)) {
            return res.status(404).json({ message: 'Membre non trouvé dans le projet' });
        }

        project.members = project.members.filter(m => m.toString() !== memberId);
        await project.save();

        res.json({ message: 'Membre retiré avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createTask,
    getTasks,
    updateTaskStatus,
    deleteTask,
    getProjectMembers,
    addMember,
    removeMember
};