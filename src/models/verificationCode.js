const { Model, DataTypes } = require('sequelize');

class VerificationCode extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false
      },
      code: {
        type: DataTypes.STRING(6),
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('password_reset', 'email_verification', 'account_activation'),
        allowNull: false,
        defaultValue: 'password_reset'
      },
      verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      reset_token: {
        type: DataTypes.STRING(64),
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
        type: DataTypes.ENUM('user'), // Simplified to only user type
        allowNull: false,
        defaultValue: 'user'
      }
    }, {
      sequelize,
      tableName: 'verification_codes',
      timestamps: true,
      indexes: [
        {
          name: 'verification_code_email_type_idx',
          fields: ['email', 'type']
        },
        {
          name: 'verification_code_reset_token_idx',
          fields: ['reset_token']
        },
        {
          name: 'verification_code_expires_at_idx',
          fields: ['expires_at']
        }
      ]
    });
  }
}

module.exports = VerificationCode;
