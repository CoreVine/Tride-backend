const { Model, DataTypes } = require('sequelize');

class VerificationCode extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      reset_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
      },
      token_used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      attempt_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      account_type: {
        type: DataTypes.ENUM('driver', 'parent'),
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      modelName: 'VerificationCode',
      tableName: 'verification_codes',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'tride_verification_code_email_type_idx',
          fields: ['email', 'type']
        },
        {
          name: 'tride_verification_code_reset_token_idx',
          fields: ['reset_token']
        },
        {
          name: 'tride_verification_code_expires_at_idx',
          fields: ['expires_at']
        }
      ]
    });
  }
}

module.exports = VerificationCode;
