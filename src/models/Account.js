const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

class Account extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      account_type: {
        type: DataTypes.STRING(15),
        allowNull: false
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      auth_method: {
        type: DataTypes.STRING(50),
        allowNull: false
      }
    }, {
      sequelize,
      modelName: 'Account',
      tableName: 'account',
      timestamps: false,
      hooks: {
        beforeSave: async (account) => {
          if (account.password) {
            account.password = await bcrypt.hash(account.password, 8);
          }
        }
      }
    });
  }

  static associate(models) {
    this.hasOne(models.Parent, {
      foreignKey: 'account_id',
      as: 'parent',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    this.hasOne(models.Driver, {
      foreignKey: 'account_id',
      as: 'driver',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    this.hasOne(models.Admin, {
      foreignKey: 'account_id',
      as: 'admin',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }

  checkPassword(password) {
    return bcrypt.compare(password, this.password);
  }
}

module.exports = Account;

