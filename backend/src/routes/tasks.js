// backend/routes/tasks.js
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

// GET /api/tasks/my - Récupérer les tâches assignées à l'utilisateur connecté
router.get('/my', auth, async (req, res) => {
    try {
        const { status, priority, search } = req.query;
        
        let query = { assignedTo: req.userId };
        
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        
        const tasks = await Task.find(query)
            .populate('project', 'title')
            .populate('assignedTo', 'fullName email')
            .populate('createdBy', 'fullName email')
            .sort({ priority: -1, deadline: 1 });
        
        res.json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/projects/:projectId/tasks - Récupérer toutes les tâches d'un projet (avec filtres)
router.get('/projects/:projectId/tasks', auth, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status, priority, assignedTo, search, page = 1, limit = 10 } = req.query;
        
        // Vérifier l'accès au projet
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        
        if (project.owner.toString() !== req.userId && 
            !project.members.some(m => m.toString() === req.userId)) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }
        
        // Construction du filtre
        let query = { project: projectId };
        
        if (status && status !== '') query.status = status;
        if (priority && priority !== '') query.priority = priority;
        if (assignedTo && assignedTo !== '') query.assignedTo = assignedTo;
        if (search && search !== '') {
            query.title = { $regex: search, $options: 'i' };
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Task.countDocuments(query);
        
        const tasks = await Task.find(query)
            .populate('assignedTo', 'fullName email')
            .populate('createdBy', 'fullName email')
            .sort({ priority: -1, deadline: 1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        res.json({
            data: tasks,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/tasks/:id - Récupérer une tâche spécifique
router.get('/:id', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('project', 'title owner members')
            .populate('assignedTo', 'fullName email')
            .populate('createdBy', 'fullName email');
        
        if (!task) {
            return res.status(404).json({ message: 'Tâche non trouvée' });
        }
        
        // Vérifier l'accès
        const project = await Project.findById(task.project._id);
        if (project.owner.toString() !== req.userId && 
            !project.members.some(m => m.toString() === req.userId)) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }
        
        res.json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/tasks - Créer une nouvelle tâche
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, priority, status, deadline, projectId, assignedTo } = req.body;
        
        if (!title) {
            return res.status(400).json({ message: 'Le titre est requis' });
        }
        
        if (!projectId) {
            return res.status(400).json({ message: 'L\'ID du projet est requis' });
        }
        
        // Vérifier l'accès au projet
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Projet non trouvé' });
        }
        
        // Seul le propriétaire ou un membre peut créer des tâches
        if (project.owner.toString() !== req.userId && 
            !project.members.some(m => m.toString() === req.userId)) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }
        
        // Vérifier que assignedTo est un membre ou le propriétaire
        if (assignedTo && assignedTo !== '') {
            const isValidMember = project.owner.toString() === assignedTo || 
                project.members.some(m => m.toString() === assignedTo);
            if (!isValidMember) {
                return res.status(400).json({ message: 'Le membre assigné n\'appartient pas au projet' });
            }
        }
        
        const task = new Task({
            title,
            description: description || '',
            priority: priority || 'moyenne',
            status: status || 'à faire',
            deadline: deadline || null,
            project: projectId,
            assignedTo: assignedTo || null,
            createdBy: req.userId
        });
        
        await task.save();
        
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'fullName email')
            .populate('createdBy', 'fullName email')
            .populate('project', 'title');
        
        res.status(201).json(populatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la création de la tâche' });
    }
});

// PUT /api/tasks/:id - Modifier une tâche
router.put('/:id', auth, async (req, res) => {
    try {
        const { title, description, priority, status, deadline, assignedTo } = req.body;
        
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Tâche non trouvée' });
        }
        
        // Vérifier l'accès
        const project = await Project.findById(task.project);
        const isOwner = project.owner.toString() === req.userId;
        const isAssignedToMe = task.assignedTo && task.assignedTo.toString() === req.userId;
        
        // Seul le propriétaire ou la personne assignée peut modifier certaines infos
        if (!isOwner && !isAssignedToMe) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }
        
        // Si ce n'est pas le propriétaire, seul le statut peut être modifié
        if (!isOwner && isAssignedToMe) {
            if (status) task.status = status;
            // Les autres champs ne peuvent pas être modifiés
            await task.save();
            return res.json(task);
        }
        
        // Modification complète pour le propriétaire
        task.title = title || task.title;
        task.description = description !== undefined ? description : task.description;
        task.priority = priority || task.priority;
        task.status = status || task.status;
        task.deadline = deadline !== undefined ? deadline : task.deadline;
        
        if (assignedTo !== undefined) {
            // Vérifier que assignedTo est valide
            if (assignedTo && assignedTo !== '') {
                const isValidMember = project.owner.toString() === assignedTo || 
                    project.members.some(m => m.toString() === assignedTo);
                if (!isValidMember) {
                    return res.status(400).json({ message: 'Le membre assigné n\'appartient pas au projet' });
                }
            }
            task.assignedTo = assignedTo || null;
        }
        
        await task.save();
        
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'fullName email');
        
        res.json(populatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la modification' });
    }
});

// PATCH /api/tasks/:id/status - Mettre à jour uniquement le statut
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status || !['à faire', 'en cours', 'terminé'].includes(status)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }
        
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Tâche non trouvée' });
        }
        
        // Vérifier l'accès (propriétaire ou personne assignée)
        const project = await Project.findById(task.project);
        const isOwner = project.owner.toString() === req.userId;
        const isAssignedToMe = task.assignedTo && task.assignedTo.toString() === req.userId;
        
        if (!isOwner && !isAssignedToMe) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }
        
        task.status = status;
        await task.save();
        
        res.json({ message: 'Statut mis à jour', task });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/tasks/:id - Supprimer une tâche
router.delete('/:id', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Tâche non trouvée' });
        }
        
        // Vérifier l'accès (seul le propriétaire du projet peut supprimer)
        const project = await Project.findById(task.project);
        if (project.owner.toString() !== req.userId) {
            return res.status(403).json({ message: 'Seul le propriétaire peut supprimer des tâches' });
        }
        
        await task.deleteOne();
        
        res.json({ message: 'Tâche supprimée avec succès' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la suppression' });
    }
});

module.exports = router;