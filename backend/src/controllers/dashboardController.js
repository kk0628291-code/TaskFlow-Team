const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

const getDashboardMetrics = async (req, res) => {
    try {
        const userId = req.user.id;

        const activeProjectsCount = await Project.countDocuments({
            owner: userId,
            status: 'actif'
        });

        const assignedTasks = await Task.find({
            assignedTo: userId
        });

        const totalAssignedTasks = assignedTasks.length;

        const completedTasks = assignedTasks.filter(task => task.status === 'terminé').length;

        const now = new Date();
        const lateTasks = assignedTasks.filter(task => {
            return task.dueDate && new Date(task.dueDate) < now && task.status !== 'terminé';
        }).length;

        const inProgressTasks = await Task.find({
            assignedTo: userId,
            status: 'en cours'
        }).sort({ priority: -1, dueDate: 1 });

        res.json({
            activeProjectsCount,
            totalAssignedTasks,
            completedTasks,
            lateTasks,
            inProgressTasks
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

module.exports = { getDashboardMetrics };