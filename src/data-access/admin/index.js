const AdminModel = require("../../models/Admin");
const AdminRolesModel = require("../../models/AdminRoles");
const RolePermissionModel = require("../../models/RolePermission");
const AdminPermissionModel = require("../../models/AdminPermission");
const BaseRepository = require("../base.repository");
const { DatabaseError, Op } = require("sequelize");

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

  async findAllExceptSelf(selfAdminId) {
    try {
      const admins = await this.model.findAll({
        where: {
          id: {
            [Op.ne]: selfAdminId // Exclude self admin
          }
        },
        attributes: {
          exclude: ['role_id', 'account_id', 'created_at', 'updated_at']
        },
        include: [
          {
            model: this.model.sequelize.models.Account,
            as: 'account',
            attributes: ['id', 'email', 'is_verified']
          },
          {
            model: AdminRolesModel,
            as: 'role',
            attributes: ['id', 'role_name']
          }
        ],
        order: [['created_at', 'DESC']]
      });
      return admins;
    } catch (error) {
      throw new DatabaseError(error);
    }    
  }

  async findByIdIncludeDetails(selfAdminId) {
    try {
      const admins = await this.model.findOne({
        where: {
          id: selfAdminId
        },
        attributes: {
          exclude: ['role_id', 'account_id', 'created_at', 'updated_at']
        },
        include: [
          {
            model: this.model.sequelize.models.Account,
            as: 'account',
            attributes: ['id', 'email', 'is_verified']
          },
          {
            model: AdminRolesModel,
            as: 'role',
            attributes: ['id', 'role_name']
          }
        ],
        order: [['created_at', 'DESC']]
      });
      return admins;
    } catch (error) {
      throw new DatabaseError(error);
    }    
  }

}

module.exports = new AdminRepository();
