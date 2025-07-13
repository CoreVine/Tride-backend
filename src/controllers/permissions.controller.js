const RolesRepository = require("../data-access/roles-permissions");

const permissionsController = {
    updateRolePermissions: async (req, res, next) => {
        try {
            const { roleId } = req.params;
            const { permissions } = req.body;

            // Update permissions in the database
            await RolesRepository.updateRolePermissions(roleId, permissions);

            return res.success("Role permissions updated successfully");
        } catch (error) {
            console.error("Error updating role permissions:", error);

            return next(error);
        }
    }
}

module.exports = permissionsController;
