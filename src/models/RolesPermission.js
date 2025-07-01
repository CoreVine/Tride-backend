const { Model, DataTypes, Sequelize } = require('sequelize');

class RolesPermissions extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.SMALLINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      role_permission_group: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      role_permission_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
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
      modelName: 'RolesPermissions',
      tableName: 'roles_permissions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  }

  static associate(models) {
    this.belongsToMany(models.AdminRoles, {
      through: models.AdminPermission,
      foreignKey: 'permission_id',
      otherKey: 'role_id',
      as: 'adminRoles'
    });
  }
}

module.exports = RolesPermissions;
