const { Model, DataTypes } = require('sequelize');

class PaymentHistory extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      paymob_receipt_id: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },

      parent_subscription_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'parent_group_subscription',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    }, {
      sequelize,
      modelName: 'PaymentHistory',
      tableName: 'payment_history',
      timestamps: false
    });
  }

  static associate(models) {
    this.belongsTo(models.ParentGroupSubscription, {
      foreignKey: 'parent_subscription_id',
      as: 'parent_group_subscription'
    });
  }
}

module.exports = PaymentHistory;
