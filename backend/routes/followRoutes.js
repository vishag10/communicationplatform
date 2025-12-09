const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const auth = require('../middleware/auth');

router.get('/search', auth, followController.searchUsers);
router.post('/request/:userId', auth, followController.sendFollowRequest);
router.post('/accept/:requestId', auth, followController.acceptFollowRequest);
router.get('/requests', auth, followController.getFollowRequests);
router.get('/mutual', auth, followController.getMutualFollowers);
router.delete('/unfollow/:userId', auth, followController.unfollow);

module.exports = router;
