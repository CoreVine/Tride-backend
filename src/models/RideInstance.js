const { Model, DataTypes } = require('sequelize');

class RideInstance extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      driver_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'driver',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      group_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'ride_group',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    }, {
      sequelize,
      modelName: 'RideInstance',
      tableName: 'ride_instance',
      timestamps: false
    });
  }

  static associate(models) {
    this.belongsTo(models.Driver, {
      foreignKey: 'driver_id',
      as: 'driver'
    });
    
    this.belongsTo(models.RideGroup, {
      foreignKey: 'group_id',
      as: 'group'
    });
    
    this.hasMany(models.RideHistory, {
      foreignKey: 'ride_instance_id',
      as: 'history'
    });
  }
}

module.exports = RideInstance;
