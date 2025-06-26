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
