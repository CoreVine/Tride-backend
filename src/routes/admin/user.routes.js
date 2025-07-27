const authMiddleware = require("../../middlewares/auth.middleware")
const userController = require("../../controllers/admins/user.controller")

const { Router } = require("express")
const { isAdmin } = require("../../middlewares/isAccount.middleware")

const adminRouter = Router()

adminRouter.get("/users/:userId/:type", authMiddleware, isAdmin, userController.getUserDetailsById)

module.exports = adminRouter
