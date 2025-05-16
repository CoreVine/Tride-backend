const { Model, DataTypes } = require('sequelize');

class GroupSubscription extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      seat_numbers: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false
      },
      ride_group_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'ride_group',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      payed_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      payment_details_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'payment_history',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      }
    }, {
      sequelize,
      modelName: 'GroupSubscription',
      tableName: 'group_subscription',
      timestamps: false
    });
  }

  static associate(models) {
    this.belongsTo(models.Parent, {
      foreignKey: 'parent_id',
      as: 'parent'
    });
    
    this.belongsTo(models.RideGroup, {
      foreignKey: 'ride_group_id',
      as: 'rideGroup'
    });
    
    this.belongsTo(models.PaymentHistory, {
      foreignKey: 'payment_details_id',
      as: 'paymentDetails'
    });
  }
}

module.exports = GroupSubscription;
