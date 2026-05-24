const Task = require('../models/Task');
const Project = require('../models/Project');

const getDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. Projets actifs (dont l'utilisateur est propriétaire ou membre)
        const activeProjects = await Project.countDocuments({
            $or: [{ owner: userId }, { members: userId }],
            status: 'actif'
        });

        // 2. Tâches assignées (non terminées)
        const assignedTasks = await Task.countDocuments({
            assignedTo: userId,
            status: { $ne: 'terminé' }
        });

        // 3. Tâches terminées
        const completedTasks = await Task.countDocuments({
            assignedTo: userId,
            status: 'terminé'
        });

        // 4. Tâches en retard (date dépassée et non terminée)
        const now = new Date();
        const lateTasks = await Task.countDocuments({
            assignedTo: userId,
            dueDate: { $lt: now, $ne: null },
            status: { $ne: 'terminé' }
        });

        // 5. Dernières tâches (5 max)
        const recentTasks = await Task.find({ assignedTo: userId })
            .populate('project', 'title')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            activeProjects,
            assignedTasks,
            completedTasks,
            lateTasks,
            recentTasks
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getDashboard };