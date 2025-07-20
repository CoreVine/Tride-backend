const { Model, DataTypes } = require('sequelize');

class ParentGroup extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
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
      },
      parent_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'parent',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      home_lat: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false
      },
      home_lng: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false
      },
      current_seats_taken: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false
      },
      status: {
        // New: did not pay, Pending: not full, expired: needs payment, ready: full and requires a driver, active: full, has a driver, and payed, incative: group is not currently being used, holding subscription
        type: DataTypes.ENUM('new', 'pending', 'expired', 'ready', 'active', 'inactive'),
        allowNull: false,
        defaultValue: 'new'
      }
    }, {
      sequelize,
      modelName: 'ParentGroup',
      tableName: 'parent_group',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['group_id', 'parent_id'],
          name: 'unique_parent_per_group'
        }
      ]
    });
  }

  static associate(models) {
    this.belongsTo(models.RideGroup, {
      foreignKey: 'group_id',
      as: 'group'
    });
    
    this.belongsTo(models.Parent, {
      foreignKey: 'parent_id',
      as: 'parent'
    });
    
    this.hasMany(models.ChildGroupDetails, {
      foreignKey: 'parent_group_id',
      as: 'childDetails'
    });
  }
}

module.exports = ParentGroup;
