const { Model, DataTypes } = require('sequelize');

class Admin extends Model {
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
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      first_name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      last_name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      language: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'en'
      },
      role_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'admin_roles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      profile_pic: {
        type: DataTypes.STRING(2048),
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      modelName: 'Admin',
      tableName: 'admin',
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
  }
}

module.exports = Admin;
