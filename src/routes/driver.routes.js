const { Router } = require("express")
const { isAdmin, isDriver, isDriverApproved } = require("../middlewares/isAccount.middleware")

const driverController = require("../controllers/drivers.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const validate = require("../middlewares/validation.middleware");
const Yup = require("yup");

const createPaymentSchema = Yup.object().shape({
  salary: Yup.number().required("Salary is required").min(0, "Salary must be a positive number"),
  issued_for: Yup.date().required("Issued for date is required"),
  status: Yup.string().oneOf(["pending", "paid"]).required("Status is required")
})

const driverRouter = Router()

// Driver endpoints
driverRouter.get("/driver/my-ride-groups", authMiddleware, isDriver, isDriverApproved, driverController.getMyRideGroups)

// Admin endpoints
// TODO: Move all admin routes to admin folder
driverRouter.get("/drivers", authMiddleware, isAdmin, driverController.getAllDrivers)
driverRouter.get("/drivers/:driverId", authMiddleware, isAdmin, driverController.getDriver)
driverRouter.get("/drivers/:driverId/payment", authMiddleware, isAdmin, driverController.getAllPaymentsForDriver)
driverRouter.post("/drivers/:driverId/payment", authMiddleware, isAdmin, validate(createPaymentSchema), driverController.createPaymentForDriver)
driverRouter.patch("/drivers/:driverId/payment/:paymentId", authMiddleware, isAdmin, validate(createPaymentSchema), driverController.updatePaymentForDriver)
driverRouter.get("/driver-current/payments", authMiddleware, isDriver, driverController.getDriverPayments)
driverRouter.patch("/drivers/:driverId/papers", authMiddleware, isAdmin, driverController.updateDriverPapersStatus)

module.exports = driverRouter
