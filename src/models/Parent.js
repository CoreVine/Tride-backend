const { Model, DataTypes } = require('sequelize');

class Parent extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      account_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'account',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      profile_pic: {
        type: DataTypes.STRING(2048),
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      google_place_id: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      lat: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true
      },
      lng: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true
      },
      formatted_address: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      city_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'city',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      gender: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      front_side_nic: {
        type: DataTypes.STRING(2048),
        allowNull: true
      },
      back_side_nic: {
        type: DataTypes.STRING(2048),
        allowNull: true
      },
      face_auth_complete: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      modelName: 'Parent',
      tableName: 'parent',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  }

  static associate(models) {
    this.belongsTo(models.Account, {
      foreignKey: 'account_id',
      as: 'account'
    });
    
    this.belongsTo(models.City, {
      foreignKey: 'city_id',
      as: 'city'
    });
    
    this.hasMany(models.Child, {
      foreignKey: 'parent_id',
      as: 'children'
    });
    
    this.hasMany(models.RideGroup, {
      foreignKey: 'parent_creator_id',
      as: 'createdGroups'
    });
    
    this.hasMany(models.GroupSubscription, {
      foreignKey: 'parent_id',
      as: 'subscriptions'
    });
    
    this.hasMany(models.ParentGroup, {
      foreignKey: 'parent_id',
      as: 'groups'
    });
  }
}

module.exports = Parent;
