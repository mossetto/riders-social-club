const router = require('express').Router()
const { getFeed, getClubsFeed, createPost, deletePost, toggleLike, getComments, addComment } = require('../controllers/postsController')
const { requireAuth } = require('../middleware/auth')
const { upload } = require('../utils/cloudinary')

router.get('/', getFeed)
router.get('/clubs', requireAuth, getClubsFeed)
router.post('/', requireAuth, upload.single('imagen'), createPost)
router.delete('/:id', requireAuth, deletePost)
router.post('/:id/like', requireAuth, toggleLike)
router.get('/:id/comments', getComments)
router.post('/:id/comments', requireAuth, addComment)

module.exports = router
