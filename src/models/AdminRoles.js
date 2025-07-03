const { Model, DataTypes, Sequelize } = require('sequelize');

class AdminRoles extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      role_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
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
      modelName: 'AdminRoles',
      tableName: 'admin_roles',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  }

  static associate(models) {
    this.belongsToMany(models.AdminPermission, {
      through: models.RolePermission,
      foreignKey: 'role_id',
      otherKey: 'permission_id',
      as: 'permissions'
    });
  }
}

module.exports = AdminRoles;
