const { Model, DataTypes } = require('sequelize');

class DriverPayment extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      salary: {
        type: DataTypes.DECIMAL(10, 2),
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
      issued_for: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      issued_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      modelName: 'DriverPayment',
      tableName: 'driver_payment',
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

module.exports = DriverPayment;
