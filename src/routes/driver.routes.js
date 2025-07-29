const { Router } = require("express")
const { isAdmin } = require("../middlewares/isAccount.middleware")

const driverController = require("../controllers/drivers.controller")
const authMiddleware = require("../middlewares/auth.middleware")

const driverRouter = Router()

// TODO: Move all admin routes to admin folder
driverRouter.get("/drivers", authMiddleware, isAdmin, driverController.getAllDrivers)
driverRouter.get("/drivers/:driverId", authMiddleware, isAdmin, driverController.getDriver)
driverRouter.patch("/drivers/:driverId/papers", authMiddleware, isAdmin, driverController.updateDriverPapersStatus)

module.exports = driverRouter
