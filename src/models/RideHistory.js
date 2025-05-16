const { Model, DataTypes } = require('sequelize');

class RideHistory extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      lat: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false
      },
      lng: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false
      },
      issued_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      ride_instance_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'ride_instance',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    }, {
      sequelize,
      modelName: 'RideHistory',
      tableName: 'ride_history',
      timestamps: false
    });
  }

  static associate(models) {
    this.belongsTo(models.RideInstance, {
      foreignKey: 'ride_instance_id',
      as: 'rideInstance'
    });
    
    this.hasMany(models.RideChildDelivered, {
      foreignKey: 'ride_history_id',
      as: 'deliveries'
    });
  }
}

module.exports = RideHistory;
