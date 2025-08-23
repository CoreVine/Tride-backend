const { Model, DataTypes, Sequelize } = require('sequelize');

class RideInstanceLocation extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      ride_instance_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'ride_instance',
          key: 'id'
        }
      },
      lat: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false
      },
      lng: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false
      },
    }, {
      sequelize,
      modelName: 'RideInstanceLocation',
      tableName: 'ride_instance_location',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  }

  static associate(models) {
    this.belongsTo(models.RideInstance, {
      foreignKey: 'ride_instance_id',
      as: 'ride_instance'
    });
  }
}

module.exports = RideInstanceLocation;
