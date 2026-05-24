const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    createTask,
    getTasks,
    updateTaskStatus,
    deleteTask,
    getProjectMembers,
    addMember,
    removeMember
} = require('../controllers/taskController');

router.use(authMiddleware);

router.post('/', createTask);
router.get('/', getTasks);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', deleteTask);

// Routes pour la gestion des membres (F4)
router.get('/projects/:projectId/members', getProjectMembers);
router.post('/projects/:projectId/members', addMember);
router.delete('/projects/:projectId/members/:memberId', removeMember);

module.exports = router;