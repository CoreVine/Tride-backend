const { Model, DataTypes } = require("sequelize");

class Schools extends Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        school_name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        city_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: {
            model: "city",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        lat: {
          type: DataTypes.DECIMAL(10, 6),
          allowNull: false,
        },
        lng: {
          type: DataTypes.DECIMAL(10, 6),
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: "Schools",
        tableName: "schools",
        timestamps: false,
      }
    );
  }

  static associate(models) {
    this.belongsTo(models.City, {
      foreignKey: "city_id",
      as: "city",
    });

    this.hasMany(models.RideGroup, {
      foreignKey: "school_id",
      as: "rideGroups",
    });
  }
}

module.exports = Schools;
