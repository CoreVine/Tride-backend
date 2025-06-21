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
        type: DataTypes.STRING
      }
    }, {
      sequelize,
      modelName: 'DayDatesGroup',
      tableName: 'day_dates_group',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['ride_group_detailsid', 'date_day'],
          name: 'unique_day_per_group'
        }
      ]
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
