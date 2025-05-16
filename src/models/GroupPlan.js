const { Model, DataTypes } = require('sequelize');

class GroupPlan extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      group_plan_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      group_days_per_month: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true
      },
      issued_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      modelName: 'GroupPlan',
      tableName: 'group_plan',
      timestamps: false
    });
  }

  static associate(models) {
    this.hasMany(models.RideGroup, {
      foreignKey: 'group_plan_id',
      as: 'groups'
    });
  }
}

module.exports = GroupPlan;
