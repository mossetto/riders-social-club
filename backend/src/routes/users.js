const router = require('express').Router()
const { getProfile, updateProfile, addMoto, getMe, searchUsers, searchByMoto, updateLocation } = require('../controllers/usersController')
const { requireAuth, optionalAuth } = require('../middleware/auth')
const { upload } = require('../utils/cloudinary')

router.get('/me', requireAuth, getMe)
router.put('/me', requireAuth, upload.single('avatar'), updateProfile)
router.post('/me/moto', requireAuth, upload.single('foto'), addMoto)
router.put('/me/location', requireAuth, updateLocation)
router.get('/search', searchUsers)
router.get('/search/moto', searchByMoto)
router.get('/:id', optionalAuth, getProfile)

module.exports = router
