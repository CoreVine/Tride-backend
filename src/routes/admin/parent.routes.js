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

const filterParentsSchema = {
  query: Yup.object().shape({
    page: Yup.number().positive().integer().default(1).optional(),
    limit: Yup.number().positive().integer().default(10).optional(),
    name: Yup.string().optional(),
    school_id: Yup.string().optional()
  })
}


const adminParentRouter = Router()

adminParentRouter.get("/admins/parents", authMiddleware, isAdmin, validate(filterParentsSchema), adminParentController.getAllParents)
adminParentRouter.get("/admins/parents/:parentId", authMiddleware, isAdmin, adminParentController.getParentById)
adminParentRouter.get("/admins/parents/:parentId/ride-groups", authMiddleware, isAdmin, adminParentController.getParentRideGroups)
adminParentRouter.patch("/admins/parents/:parentId", authMiddleware, isAdmin, validate(updateParentSchema), adminParentController.updateParent)

module.exports = adminParentRouter
