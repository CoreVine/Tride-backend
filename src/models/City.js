const { Model, DataTypes } = require('sequelize');

class City extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      governorate_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'governorate',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      }
    }, {
      sequelize,
      modelName: 'City',
      tableName: 'city',
      timestamps: false
    });
  }

  static associate(models) {
    this.belongsTo(models.Governorate, {
      foreignKey: 'governorate_id',
      as: 'governorate'
    });
    
    this.hasMany(models.Parent, {
      foreignKey: 'city_id',
      as: 'parents'
    });
    
    this.hasMany(models.Driver, {
      foreignKey: 'city_id',
      as: 'drivers'
    });
    
    this.hasMany(models.Schools, {
      foreignKey: 'city_id',
      as: 'schools'
    });
  }
}

module.exports = City;
