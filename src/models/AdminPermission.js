const { Model, DataTypes, Sequelize } = require('sequelize');

class AdminPermission extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      account_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'account',
          key: 'id'
        }
      },
      role_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'admin_roles',
          key: 'id'
        }
      },
      permission_id: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'roles_permissions',
          key: 'id'
        }
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, {
      sequelize,
      modelName: 'AdminPermission',
      tableName: 'admin_permissions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  }

  static associate(models) {
    this.belongsTo(models.Account, {
      foreignKey: 'account_id',
      as: 'account'
    });
    
    this.belongsTo(models.AdminRoles, {
      foreignKey: 'role_id',
      as: 'role'
    });
    
    this.belongsTo(models.RolesPermissions, {
      foreignKey: 'permission_id',
      as: 'permission'
    });
  }
}

module.exports = AdminPermission;
