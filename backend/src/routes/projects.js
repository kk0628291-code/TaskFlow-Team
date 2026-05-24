// backend/routes/projects.js
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// GET /api/projects - Récupérer tous les projets de l'utilisateur (avec pagination)
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Récupérer les projets où l'utilisateur est owner OU membre
        const query = {
            $or: [
                { owner: req.userId },
                { members: req.userId }
            ]
        };
        
        const total = await Project.countDocuments(query);
        const projects = await Project.find(query)
            .populate('owner', 'fullName email')
            .populate('members', 'fullName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        res.json({
            data: projects,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            limit
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/projects/owned - Récupérer les projets dont l'utilisateur est propriétaire
router.get('/owned', auth, async (req, res) => {
    try {
        const projects = await Project.find({ owner: req.userId })
            .populate('members', 'fullName email');
        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/projects/:id - Récupérer un projet spécifique
router.get('/:id', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('owner', 'fullName email')
            .populate('members', 'fullName email');
        
        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        
        // Vérifier l'accès
        if (project.owner.toString() !== req.userId && 
            !project.members.some(m => m._id.toString() === req.userId)) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }
        
        res.json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/projects - Créer un nouveau projet
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, deadline, status } = req.body;
        
        if (!title) {
            return res.status(400).json({ message: 'Le titre est requis' });
        }
        
        const project = new Project({
            title,
            description: description || '',
            deadline: deadline || null,
            status: status || 'actif',
            owner: req.userId,
            members: [] // Le owner est automatiquement membre mais pas dans le tableau
        });
        
        await project.save();
        
        const populatedProject = await Project.findById(project._id)
            .populate('owner', 'fullName email');
        
        res.status(201).json(populatedProject);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la création du projet' });
    }
});

// PUT /api/projects/:id - Modifier un projet
router.put('/:id', auth, async (req, res) => {
    try {
        const { title, description, deadline, status } = req.body;
        
        const project = await Project.findById(req.params.id);
        
        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        
        // Seul le propriétaire peut modifier
        if (project.owner.toString() !== req.userId) {
            return res.status(403).json({ message: 'Seul le propriétaire peut modifier le projet' });
        }
        
        project.title = title || project.title;
        project.description = description !== undefined ? description : project.description;
        project.deadline = deadline !== undefined ? deadline : project.deadline;
        project.status = status || project.status;
        
        await project.save();
        
        res.json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la modification' });
    }
});

// DELETE /api/projects/:id - Supprimer un projet (suppression en cascade)
router.delete('/:id', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        
        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        
        // Seul le propriétaire peut supprimer
        if (project.owner.toString() !== req.userId) {
            return res.status(403).json({ message: 'Seul le propriétaire peut supprimer le projet' });
        }
        
        // Suppression en cascade via le middleware
        await project.deleteOne();
        
        res.json({ message: 'Projet supprimé avec succès' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la suppression' });
    }
});

// POST /api/projects/:id/invite - Inviter un membre par email
router.post('/:id/invite', auth, async (req, res) => {
    try {
        const { email } = req.body;
        const project = await Project.findById(req.params.id);
        
        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        
        // Seul le propriétaire peut inviter
        if (project.owner.toString() !== req.userId) {
            return res.status(403).json({ message: 'Seul le propriétaire peut inviter des membres' });
        }
        
        const User = require('../models/User');
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: 'Aucun utilisateur trouvé avec cet email' });
        }
        
        if (project.members.includes(user._id)) {
            return res.status(400).json({ message: 'Cet utilisateur est déjà membre' });
        }
        
        project.members.push(user._id);
        await project.save();
        
        res.json({ message: 'Membre ajouté avec succès', member: { _id: user._id, fullName: user.fullName, email: user.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de l\'invitation' });
    }
});

// DELETE /api/projects/:id/members/:userId - Retirer un membre
router.delete('/:id/members/:userId', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        
        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        
        if (project.owner.toString() !== req.userId) {
            return res.status(403).json({ message: 'Seul le propriétaire peut retirer des membres' });
        }
        
        project.members = project.members.filter(m => m.toString() !== req.params.userId);
        await project.save();
        
        // Optionnel: Réassigner les tâches de ce membre à null
        await Task.updateMany(
            { project: project._id, assignedTo: req.params.userId },
            { assignedTo: null }
        );
        
        res.json({ message: 'Membre retiré avec succès' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors du retrait du membre' });
    }
});

// GET /api/projects/:id/members - Récupérer les membres d'un projet
router.get('/:id/members', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('owner', 'fullName email')
            .populate('members', 'fullName email');
        
        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        
        const members = [
            { ...project.owner.toObject(), isOwner: true },
            ...project.members.map(m => ({ ...m.toObject(), isOwner: false }))
        ];
        
        res.json(members);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;