const { Model, DataTypes } = require('sequelize');

class ParentGroupSubscription extends Model {
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
      current_seats_taken: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false
      },
      pickup_days_count: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false
      },
      started_at: {
        type: DataTypes.DATE,
       allowNull: true,
      },
      valid_until: {
        type: DataTypes.DATE,
        allowNull: true
      },
      plan_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'plan',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('new', 'pending', 'paid', 'expired'),
        allowNull: false,
        defaultValue: 'new'
      }
    }, {
      sequelize,
      modelName: 'ParentGroupSubscription',
      tableName: 'parent_group_subscription',
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
    
    this.belongsTo(models.Plan, {
      foreignKey: 'plan_id',
      as: 'plan'
    });

    this.hasMany(models.PaymentHistory, {
      foreignKey: 'parent_subscription_id',
      as: 'payment_history'
    });
  }
}

module.exports = ParentGroupSubscription;
