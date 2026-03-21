const router = require('express').Router()
const { getProfile, updateProfile, addMoto, getMe } = require('../controllers/usersController')
const { requireAuth } = require('../middleware/auth')
const { upload } = require('../utils/cloudinary')

router.get('/me', requireAuth, getMe)
router.put('/me', requireAuth, upload.single('avatar'), updateProfile)
router.post('/me/moto', requireAuth, upload.single('foto'), addMoto)
router.get('/:id', getProfile)

module.exports = router
