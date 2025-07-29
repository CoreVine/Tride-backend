const Yup = require("yup");
const { Router } = require("express");
const { isDriverApproved } = require("../middlewares/isAccount.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const rideController = require("../controllers/ride.controller");
const validate = require("../middlewares/validation.middleware");

const rideRouter = Router();

const createRideInstanceSchema = Yup.object().shape({
  type: Yup.string().oneOf(["to_school", "from_school"]).required(),
  ride_group_id: Yup.number().integer().positive().required()
});

rideRouter.post(
    "/ride/create",
    authMiddleware,
    isDriverApproved,
    validate(createRideInstanceSchema),
    rideController.createRideInstance
);

module.exports = rideRouter;
