const { Model, DataTypes, Sequelize } = require('sequelize');

class RolePermission extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
          model: 'admin_permission',
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
      modelName: 'RolePermission',
      tableName: 'role_permission',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  }

  static associate(models) {
    this.belongsTo(models.AdminRoles, {
      foreignKey: 'role_id',
      as: 'role'
    });
    
    this.belongsTo(models.AdminPermission, {
      foreignKey: 'permission_id',
      as: 'permission'
    });
  }
}

module.exports = RolePermission;
