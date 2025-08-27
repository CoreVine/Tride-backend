const Yup = require("yup");
const { Router } = require("express");
const { isDriverApproved } = require("../middlewares/isAccount.middleware");
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

// Force leave ride room (for debugging/cleanup)
rideRouter.post(
    "/ride/leave-room",
    authMiddleware,
    isDriverApproved,
    rideController.forceLeaveRoom
);

module.exports = rideRouter;
