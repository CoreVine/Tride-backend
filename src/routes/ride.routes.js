const Yup = require("yup");
const { Router } = require("express");
const { isDriverApproved, isAccountType, isAdminWithPermissions } = require("../middlewares/isAccount.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const rideController = require("../controllers/ride.controller");
const validate = require("../middlewares/validation.middleware");

const rideRouter = Router();

const createRideInstanceSchema = Yup.object().shape({
  type: Yup.string().oneOf(["to_school", "to_home"]).required(),
  ride_group_id: Yup.number().integer().positive().required()
});

const cancelRideInstanceSchema = Yup.object().shape({
  ride_instance_id: Yup.number().integer().positive().required()
});

const joinRideSchema = Yup.object().shape({
  ride_group_id: Yup.number().integer().positive().required(),
  location: Yup.object().shape({
    lat: Yup.number().min(-90).max(90).required(),
    lng: Yup.number().min(-180).max(180).required()
  }).required()
});

const updateLocationSchema = Yup.object().shape({
  location: Yup.object().shape({
    lat: Yup.number().min(-90).max(90).required(),
    lng: Yup.number().min(-180).max(180).required()
  }).required()
});

const confirmCheckpointSchema = Yup.object().shape({
  ride_group_id: Yup.number().integer().positive().required(),
  checkpoint_index: Yup.number().integer().min(0).required(),
  location: Yup.object().shape({
    lat: Yup.number().min(-90).max(90).required(),
    lng: Yup.number().min(-180).max(180).required()
  }).required(),
  children_ids: Yup.array().of(Yup.number().integer().positive()).default([])
});

const parentWatchRideSchema = Yup.object().shape({
  ride_group_id: Yup.number().integer().positive().required()
});

const adminWatchRideSchema = Yup.object().shape({
  ride_group_id: Yup.number().integer().positive().required()
});

const parentGetRideUpdatesSchema = Yup.object().shape({
  ride_group_id: Yup.number().integer().positive().required()
});

rideRouter.post(
    "/ride/create",
    authMiddleware,
    isDriverApproved,
    validate(createRideInstanceSchema),
    rideController.createRideInstance
);

rideRouter.delete(
    "/ride/:ride_instance_id/cancel",
    authMiddleware,
    isDriverApproved,
    validate({ params: cancelRideInstanceSchema }),
    rideController.cancelRideInstance
);

rideRouter.post(
    "/ride/join",
    authMiddleware,
    isDriverApproved,
    validate(joinRideSchema),
    rideController.joinRide
);

rideRouter.post(
    "/ride/location",
    authMiddleware,
    isDriverApproved,
    validate(updateLocationSchema),
    rideController.updateLocation
);

rideRouter.post(
    "/ride/checkpoint/confirm",
    authMiddleware,
    isDriverApproved,
    validate(confirmCheckpointSchema),
    rideController.confirmCheckpoint
);

rideRouter.post(
    "/ride/complete",
    authMiddleware,
    isDriverApproved,
    rideController.completeRide
);

// Force leave ride room (for debugging/cleanup)
rideRouter.post(
    "/ride/leave-room",
    authMiddleware,
    isDriverApproved,
    rideController.forceLeaveRoom
);

// Parent routes
rideRouter.post(
    "/ride/parent/watch",
    authMiddleware,
    isAccountType("parent"),
    validate(parentWatchRideSchema),
    rideController.parentWatchRide
);

rideRouter.get(
    "/ride/parent/:ride_group_id/location-updates",
    authMiddleware,
    isAccountType("parent"),
    validate({ params: parentGetRideUpdatesSchema }),
    rideController.parentGetRideUpdates
);

// Admin routes
rideRouter.post(
    "/ride/admin/watch",
    authMiddleware,
    isAccountType("admin"),
    validate(adminWatchRideSchema),
    rideController.adminWatchRide
);

rideRouter.get(
    "/ride/admin/watch-all",
    authMiddleware,
    isAccountType("admin"),
    rideController.adminWatchAllRides
);

// Driver cancel ride (different from cancel ride instance)
rideRouter.post(
    "/ride/cancel",
    authMiddleware,
    isDriverApproved,
    rideController.driverCancelRide
);

module.exports = rideRouter;
