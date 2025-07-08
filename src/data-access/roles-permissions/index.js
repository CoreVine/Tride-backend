const AdminRoles = require('../../models/AdminRoles');
const PlanModel = require('../../models/Plan');
const { ADMIN_ROLE_SUPER_ADMIN } = require('../../utils/constants/admin-roles');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const BaseRepository = require('../base.repository');

class RolePermissionRepository extends BaseRepository {
    constructor() {
        super(AdminRoles);
    }

    async updateRolePermissions(roleId, permissions) {
        const t = await this.model.sequelize.transaction();
        try {
            // Find the role by ID
            const role = await this.model.findByPk(roleId, { transaction: t });
            if (!role) {
                throw new NotFoundError('Role not found');
            }

            if (role.role_name === ADMIN_ROLE_SUPER_ADMIN) {
                throw new BadRequestError('Cannot modify permissions for this role');
            }

            // Clear existing permissions
            await role.setPermissions([], { transaction: t });

            // Add new permissions
            if (permissions && permissions.length > 0) {
                await role.addPermissions(permissions, { transaction: t });
            }

            // Commit the transaction
            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
}

module.exports = new RolePermissionRepository();
