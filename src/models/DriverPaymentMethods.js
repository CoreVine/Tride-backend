const { Model, DataTypes } = require('sequelize');

class DriverPaymentMethods extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      driver_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'driver',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      payment_method: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      payment_details_json: {
        type: DataTypes.JSON,
        allowNull: false
      }
    }, {
      sequelize,
      modelName: 'DriverPaymentMethods',
      tableName: 'driver_payment_methods',
      timestamps: false
    });
  }

  static associate(models) {
    this.belongsTo(models.Driver, {
      foreignKey: 'driver_id',
      as: 'driver'
    });
  }
}

module.exports = DriverPaymentMethods;
