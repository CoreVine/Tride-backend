const { Model, DataTypes } = require('sequelize');

class DriverPapers extends Model {
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
      front_side_national_url: {
        type: DataTypes.STRING(2048),
        allowNull: false
      },
      back_side_national_url: {
        type: DataTypes.STRING(2048),
        allowNull: false
      },
      car_model: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      car_model_year: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: false
      },
      driver_license_url: {
        type: DataTypes.STRING(2048),
        allowNull: false
      },
      driver_license_exp_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      car_license_url: {
        type: DataTypes.STRING(2048),
        allowNull: false
      },
      car_license_exp_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      approved: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      approval_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'DriverPapers',
      tableName: 'driver_papers',
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

module.exports = DriverPapers;
