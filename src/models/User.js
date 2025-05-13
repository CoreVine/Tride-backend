const { Model, DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

class User extends Model {
  static init(sequelize) {
    super.init(
      {
        user_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true
        },
        acc_type: {
          type: DataTypes.ENUM('user'),  // Simplified to only allow 'user' type
          allowNull: false,
          defaultValue: 'user'
        },
        profile_picture_url: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        name: {
          type: DataTypes.STRING(70),
          allowNull: false
        },
        username: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true
        },
        email_verified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        password: DataTypes.VIRTUAL, // Virtual field that doesn't exist in the database
        password_hash: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        phone_number: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: false
        }
      },
      {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );

    // Password hashing hook
    this.addHook("beforeSave", async (user) => {
      if (user.password) {
        user.password_hash = await bcrypt.hash(user.password, 8);
      }
    });

    return this;
  }

  // Model associations
  static associate(models) {
    /* 
      Make sure models are made first before
      adding associations!
    */
    // this.hasMany(models.Order, {
    //   foreignKey: 'user_id',
    //   as: 'orders',
    //   onDelete: 'CASCADE'
    // });
    // this.hasMany(models.CustomerCar, {
    //   foreignKey: 'customer_id',
    //   as: 'cars',
    //   onDelete: 'CASCADE'
    // });
    // this.hasMany(models.Rating, {
    //   foreignKey: 'user_id',
    //   as: 'ratings',
    //   onDelete: 'CASCADE'
    // });
    // this.belongsToMany(models.Company, {
    //   through: models.Employee,
    //   foreignKey: 'user_id',
    //   otherKey: 'company_id',
    //   as: 'companies'
    // });
  }

  // Validate user password
  checkPassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }
}

module.exports = User;

