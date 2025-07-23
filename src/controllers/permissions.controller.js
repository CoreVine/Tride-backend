const RolesRepository = require("../data-access/roles-permissions")
const AdminPermissionRepository = require("../data-access/adminPermission")

const permissionsController = {
  getRoles: async (req, res, next) => {
    try {
      const roles = await RolesRepository.findAll({
        include: {
          association: "permissions"
        }
      })
      return res.success("Roles retrieved successfully", roles)
    } catch (error) {
      console.error("Error fetching roles:", error)
      return next(error)
    }
  },

  getAdminPermissions: async (req, res, next) => {
    try {
      const permissions = await AdminPermissionRepository.findAll()
      return res.success("Admin permissions retrieved successfully", permissions)
    } catch (error) {
      console.error("Error fetching admin permissions:", error)
      return next(error)
    }
  },

  getRolePermissions: async (req, res, next) => {
    try {
      const { roleId } = req.params
      const permissions = await RolesRepository.getRolePermissions(roleId)
      return res.success("Role permissions retrieved successfully", permissions)
    } catch (error) {
      console.error("Error fetching role permissions:", error)
      return next(error)
    }
  },

  updateRolePermissions: async (req, res, next) => {
    try {
      const { roleId } = req.params
      const { permissions } = req.body

      await RolesRepository.updateRolePermissions(roleId, permissions)

      return res.success("Role permissions updated successfully")
    } catch (error) {
      console.error("Error updating role permissions:", error)

      return next(error)
    }
  }
}

module.exports = permissionsController
