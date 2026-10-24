const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');

router.get('/', rideController.getAllRides);
router.get('/:id', rideController.getRideById);
router.post('/', rideController.createRide);
router.put('/:id', rideController.updateRide);
router.patch('/:id/status', rideController.updateRideStatus);
router.delete('/:id', rideController.deleteRide);

module.exports = router;
