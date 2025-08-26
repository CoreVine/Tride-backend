const { Router } = require("express")
const { isAdmin, isDriver, isDriverApproved } = require("../middlewares/isAccount.middleware")

const driverController = require("../controllers/drivers.controller")
const authMiddleware = require("../middlewares/auth.middleware")

const driverRouter = Router()

// Driver endpoints
driverRouter.get("/driver/my-ride-groups", authMiddleware, isDriver, isDriverApproved, driverController.getMyRideGroups)

// Admin endpoints
// TODO: Move all admin routes to admin folder
driverRouter.get("/drivers", authMiddleware, isAdmin, driverController.getAllDrivers)
driverRouter.get("/drivers/:driverId", authMiddleware, isAdmin, driverController.getDriver)
driverRouter.get("/drivers/:driverId/payments", authMiddleware, isDriver, driverController.getDriverPayments)
driverRouter.patch("/drivers/:driverId/papers", authMiddleware, isAdmin, driverController.updateDriverPapersStatus)

module.exports = driverRouter
