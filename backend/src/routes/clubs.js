const router = require('express').Router()
const { getClubs, getClub, createClub, joinClub, updateMember, getMyClubes } = require('../controllers/clubsController')
const { getClubEvents, createEvent, getRoutes, addRoute } = require('../controllers/eventsController')
const { requireAuth } = require('../middleware/auth')
const { upload } = require('../utils/cloudinary')

router.get('/', getClubs)
router.get('/mine', requireAuth, getMyClubes)
router.get('/:id', getClub)
router.post('/', requireAuth, upload.fields([{ name: 'escudo', maxCount: 1 }, { name: 'portada', maxCount: 1 }]), createClub)
router.post('/:id/join', requireAuth, joinClub)
router.put('/:id/members/:userId', requireAuth, updateMember)
router.get('/:clubId/events', getClubEvents)
router.post('/:clubId/events', requireAuth, createEvent)
router.get('/:clubId/routes', getRoutes)
router.post('/:clubId/routes', requireAuth, addRoute)

module.exports = router
