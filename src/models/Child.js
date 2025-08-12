const { Model, DataTypes } = require('sequelize');

class Child extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      profile_pic: {
        type: DataTypes.STRING(2048),
        allowNull: true
      },
      grade: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      gender: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      parent_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'parent',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    }, {
      sequelize,
      modelName: 'Child',
      tableName: 'child',
      timestamps: false
    });
  }

  static associate(models) {
    this.belongsTo(models.Parent, {
      foreignKey: 'parent_id',
      as: 'parent'
    });
    
    this.hasMany(models.ChildGroupDetails, {
      foreignKey: 'child_id',
      as: 'groupDetails'
    });
  }
}

module.exports = Child;
