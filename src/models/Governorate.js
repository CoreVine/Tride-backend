const { Model, DataTypes } = require('sequelize');

class Governorate extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      governorate_name: {
        type: DataTypes.STRING(255),
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'Governorate',
      tableName: 'governorate',
      timestamps: false
    });
  }

  static associate(models) {
    this.hasMany(models.City, {
      foreignKey: 'governorate_id',
      as: 'cities'
    });
  }
}

module.exports = Governorate;
