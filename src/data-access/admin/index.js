const AdminModel = require("../../models/Admin");
const AdminRolesModel = require("../../models/AdminRoles");
const RolePermissionModel = require("../../models/RolePermission");
const AdminPermissionModel = require("../../models/AdminPermission");
const BaseRepository = require("../base.repository");
const { DatabaseError } = require("sequelize");

class AdminRepository extends BaseRepository {
  constructor() {
    super(AdminModel);
  }

  async createNewAdmin(adminData) {
    const t = await this.model.sequelize.transaction();
    try {
        // Assign default role
        const defaultRole = await AdminRolesModel.findOne({
          where: { role_name: 'basic admin' }
        });
  
        if (!defaultRole) {
          throw new DatabaseError('Default role not found');
        }
      // Create admin
      const admin = await this.create({
        ...adminData,
        role_id: defaultRole.id
      }, { transaction: t });

      // Commit transaction
      await t.commit();
      return admin;
    } catch (error) {
      await t.rollback();
      throw new DatabaseError(error);
    }
  }

}

module.exports = new AdminRepository();
