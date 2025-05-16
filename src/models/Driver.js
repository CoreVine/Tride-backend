const { Model, DataTypes } = require('sequelize');

class Driver extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      profile_pic: {
        type: DataTypes.STRING(2048),
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      license_number: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      lat: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true
      },
      lng: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true
      },
      formatted_address: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      city_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'city',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      gender: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      modelName: 'Driver',
      tableName: 'driver',
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
    
    this.belongsTo(models.City, {
      foreignKey: 'city_id',
      as: 'city'
    });
    
    this.hasOne(models.DriverPapers, {
      foreignKey: 'driver_id',
      as: 'papers'
    });
    
    this.hasMany(models.DriverPayment, {
      foreignKey: 'driver_id',
      as: 'payments'
    });
    
    this.hasMany(models.DriverPaymentMethods, {
      foreignKey: 'driver_id',
      as: 'paymentMethods'
    });
    
    this.hasMany(models.RideGroup, {
      foreignKey: 'driver_id',
      as: 'groups'
    });
    
    this.hasMany(models.RideInstance, {
      foreignKey: 'driver_id',
      as: 'rides'
    });
  }
}

module.exports = Driver;
