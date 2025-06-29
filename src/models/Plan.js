const { Model, DataTypes } = require('sequelize');

class Plan extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      range: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      installment_plan: {
        type: DataTypes.BOOLEAN,
        allowNull: false
      },
      discount_percentage: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      },
      pay_every_n_months: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 1
      },
      months_count: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false
      }
    }, {
      sequelize,
      modelName: 'Plan',
      tableName: 'plan',
      timestamps: false
    });
  }

  static associate(models) {
    this.hasMany(models.ParentGroupSubscription, {
      foreignKey: 'plan_id',
      as: 'plan'
    });
  }
}

module.exports = Plan;
