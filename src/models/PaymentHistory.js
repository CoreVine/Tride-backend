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
      payed_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      payment_sub_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      }
    }, {
      sequelize,
      modelName: 'PaymentHistory',
      tableName: 'payment_history',
      timestamps: false
    });
  }

  static associate(models) {
    this.hasMany(models.GroupSubscription, {
      foreignKey: 'payment_details_id',
      as: 'subscriptions'
    });
  }
}

module.exports = PaymentHistory;
