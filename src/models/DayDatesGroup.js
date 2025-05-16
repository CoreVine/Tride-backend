const { Model, DataTypes } = require('sequelize');

class DayDatesGroup extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      ride_group_detailsid: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'ride_group',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      date_day: {
        type: DataTypes.DATEONLY,
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'DayDatesGroup',
      tableName: 'day_dates_group',
      timestamps: false
    });
  }

  static associate(models) {
    this.belongsTo(models.RideGroup, {
      foreignKey: 'ride_group_detailsid',
      as: 'rideGroup'
    });
  }
}

module.exports = DayDatesGroup;
