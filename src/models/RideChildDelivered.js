const { Model, DataTypes } = require('sequelize');

class RideChildDelivered extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      ride_history_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'ride_history',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      child_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'child',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      delivered_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    }, {
      sequelize,
      modelName: 'RideChildDelivered',
      tableName: 'ride_child_delivered',
      timestamps: false
    });
  }

  static associate(models) {
    this.belongsTo(models.RideHistory, {
      foreignKey: 'ride_history_id',
      as: 'rideHistory'
    });
    
    this.belongsTo(models.Child, {
      foreignKey: 'child_id',
      as: 'child'
    });
  }
}

module.exports = RideChildDelivered;
