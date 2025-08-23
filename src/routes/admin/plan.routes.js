const authMiddleware = require("../../middlewares/auth.middleware")
const adminPlanController = require("../../controllers/admins/plan.controller")

const { Router } = require("express")
const { isAdmin } = require("../../middlewares/isAccount.middleware")

const planRouter = Router()

planRouter.get("/admin/plans", authMiddleware, isAdmin, adminPlanController.getPlans)

module.exports = planRouter
