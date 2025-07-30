const Yup = require("yup")

const adminParentController = require("../../controllers/admins/parent.controller")
const authMiddleware = require("../../middlewares/auth.middleware")
const validate = require("../../middlewares/validation.middleware")

const { ADMIN_ROLE_SUPER_ADMIN } = require("../../utils/constants/admin-roles")
const { isAdmin } = require("../../middlewares/isAccount.middleware")

const { Router } = require("express")

const updateParentSchema = {
  body: Yup.object().shape({
    documents_approved: Yup.boolean().required()
  })
}


const adminParentRouter = Router()

adminParentRouter.get("/admins/parents", authMiddleware, adminParentController.getAllParents)
adminParentRouter.get("/admins/parents/:parentId", authMiddleware, adminParentController.getParentById)
adminParentRouter.get("/admins/parents/:parentId/ride-groups", authMiddleware, adminParentController.getParentRideGroups)
adminParentRouter.patch("/admins/parents/:parentId", authMiddleware, validate(updateParentSchema), adminParentController.updateParent)

module.exports = adminParentRouter
