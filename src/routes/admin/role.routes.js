const { Router } = require("express")
const authMiddleware = require("../../middlewares/auth.middleware")
const validate = require("../../middlewares/validation.middleware")
const Yup = require("yup")
const { isAdminWithRole } = require("../../middlewares/isAccount.middleware")

const permissionsController = require("../../controllers/permissions.controller")
const { ADMIN_ROLE_SUPER_ADMIN } = require("../../utils/constants/admin-roles")

const roleRouter = Router()

const updateRolePermissionsSchema = {
  params: Yup.object().shape({
    roleId: Yup.number().required().positive().integer()
  }),
  body: Yup.object().shape({
    permissions: Yup.array().of(Yup.number().positive().integer()).required()
  })
}

roleRouter.get("/roles", authMiddleware, isAdminWithRole(ADMIN_ROLE_SUPER_ADMIN), permissionsController.getRoles)
roleRouter.get("/roles/permissions", authMiddleware, isAdminWithRole(ADMIN_ROLE_SUPER_ADMIN), permissionsController.getAdminPermissions)
roleRouter.get("/roles/:roleId/permissions", authMiddleware, isAdminWithRole(ADMIN_ROLE_SUPER_ADMIN), permissionsController.getRolePermissions)
roleRouter.patch("/roles/:roleId/permissions", authMiddleware, isAdminWithRole(ADMIN_ROLE_SUPER_ADMIN), validate(updateRolePermissionsSchema), permissionsController.updateRolePermissions)

module.exports = roleRouter
