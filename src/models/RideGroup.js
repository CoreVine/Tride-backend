const { Model, DataTypes } = require('sequelize');

class RideGroup extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      parent_creator_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'parent',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      group_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: {
          fields: ['parent_creator_id', 'group_name'],
          msg: 'This group name is already taken by this parent'
        }
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
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
      school_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'schools',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      current_seats_taken: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      group_plan_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'group_plan',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      invite_code: {
        type: DataTypes.STRING(255),
        unique: {
          msg: 'This invite code is already taken'
        }
      },
      group_type: {
        type: DataTypes.ENUM('regular', 'premium'),
        allowNull: false,
        defaultValue: 'regular'
      }
    }, {
      sequelize,
      modelName: 'RideGroup',
      tableName: 'ride_group',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  }

  static associate(models) {
    this.belongsTo(models.Parent, {
      foreignKey: 'parent_creator_id',
      as: 'creator'
    });
    
    this.belongsTo(models.Driver, {
      foreignKey: 'driver_id',
      as: 'driver'
    });
    
    this.belongsTo(models.Schools, {
      foreignKey: 'school_id',
      as: 'school'
    });
    
    this.belongsTo(models.GroupPlan, {
      foreignKey: 'group_plan_id',
      as: 'plan'
    });
    
    this.hasMany(models.ParentGroup, {
      foreignKey: 'group_id',
      as: 'parentGroups'
    });
    
    this.hasMany(models.GroupSubscription, {
      foreignKey: 'ride_group_id',
      as: 'subscriptions'
    });
    
    this.hasMany(models.RideInstance, {
      foreignKey: 'group_id',
      as: 'rideInstances'
    });
    
    this.hasMany(models.DayDatesGroup, {
      foreignKey: 'ride_group_detailsid',
      as: 'dayDates'
    });
  }
}

module.exports = RideGroup;

