const { Model, DataTypes } = require('sequelize');

class ChildGroupDetails extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      parent_group_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'parent_group',
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
      timing_from: {
        type: DataTypes.TIME,
        allowNull: false
      },
      timing_to: {
        type: DataTypes.TIME,
        allowNull: false
      }
    }, {
      sequelize,
      modelName: 'ChildGroupDetails',
      tableName: 'child_group_details',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['parent_group_id', 'child_id'],
          name: 'unique_child_per_parent_group'
        }
      ]
    });
  }

  static associate(models) {
    this.belongsTo(models.ParentGroup, {
      foreignKey: 'parent_group_id',
      as: 'parentGroup'
    });
    
    this.belongsTo(models.Child, {
      foreignKey: 'child_id',
      as: 'child'
    });
  }
}

module.exports = ChildGroupDetails;
