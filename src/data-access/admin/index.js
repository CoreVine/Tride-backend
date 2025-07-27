const AdminModel = require("../../models/Admin");
const AdminRolesModel = require("../../models/AdminRoles");
const RolePermissionModel = require("../../models/RolePermission");
const AdminPermissionModel = require("../../models/AdminPermission");
const BaseRepository = require("../base.repository");
const { DatabaseError, Op } = require("sequelize");
const { BadRequestError, NotFoundError } = require("../../utils/errors");
const { ADMIN_ROLE_SUPER_ADMIN } = require("../../utils/constants/admin-roles");

class AdminRepository extends BaseRepository {
  constructor() {
    super(AdminModel);
  }

  async findByIdIncludeAccount(adminId) {
    try {
      const admin = await this.model.findOne({
        where: { id: adminId },
        include: [
          {
            model: this.model.sequelize.models.Account,
            as: 'account',
            attributes: ['id', 'email', 'password', 'is_verified']
          },
          {
            model: AdminRolesModel,
            as: 'role',
            attributes: ['id', 'role_name']
          }
        ]
      });
      return admin;
    } catch (error) {
      throw new DatabaseError(error);
    }
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

  async getPermissionsByAccountId(accountId) {
    try {
      const admin = await this.model.findOne({
        where: { account_id: accountId },
        include: [
          {
            model: AdminRolesModel,
            as: 'role',
            include: [
              {
                model: AdminPermissionModel,
                as: 'permissions',
                attributes: ['id', 'role_permission_group', 'role_permission_name']
              }
            ],
            attributes: ['id', 'role_name']
          }
        ],
        attributes: ['id', 'account_id', 'created_at', 'updated_at']
      });

      if (!admin) {
        throw new NotFoundError("Admin not found for the given account ID");
      }

      return admin;
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findByIdIncludeDetails(selfAdminId, options = {}) {
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
        order: [['created_at', 'DESC']],
        ...options
      });
      return admins;
    } catch (error) {
      throw new DatabaseError(error);
    }    
  }

  async updateAdminRole(selfAdminId, adminId, roleId) {
    console.log(selfAdminId, adminId);
    
    const t = await this.model.sequelize.transaction();

    try {
      const adminToUpdate = await this.findByIdIncludeDetails(adminId, { transaction: t });

      if (!adminToUpdate || adminToUpdate.role.role_name === ADMIN_ROLE_SUPER_ADMIN){
        throw new BadRequestError('cannot update role of this admin!');
      }

      const role = await this.model.sequelize.models.AdminRoles.findByPk(roleId);

      if (!role || role.role_name === ADMIN_ROLE_SUPER_ADMIN) {
        throw new NotFoundError("Cannot find or update to this role");
      }

      await this.model.update({
        role_id: roleId
      }, {
        where: {id: adminId}
      });

    } catch (error) {
      await t.rollback();

      throw error;
    }
  }

  async updateAdmin(adminId, updateData) {
    try {
        const admin = await this.model.findByPk(adminId);

        if (!admin) {
          throw new NotFoundError("Admin not found");
        }

        if (updateData.first_name) admin.first_name = updateData.first_name;
        if (updateData.last_name) admin.last_name = updateData.last_name;
        if (updateData.language) admin.language = updateData.language;
        if (updateData.profile_pic) admin.profile_pic = updateData.profile_pic;

        await admin.save();
    } catch (error) {
      await t.rollback();
      throw new DatabaseError(error);
    }
  }

}

module.exports = new AdminRepository();
