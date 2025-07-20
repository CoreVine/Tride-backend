const mongoose = require('mongoose');
const { Schema } = mongoose;

const accountsFirebaseTokensSchema = new Schema({
  account_id: {
    type: Schema.Types.String,
    required: true,
    index: true,
    unique: true
  },
  tokens: {
    type: [Schema.Types.String],
    required: true,
    default: [],
    validate: [arrayLimit, '{PATH} exceeds the limit of 20']
  }
}, {
  timestamps: true
});

function arrayLimit(val) {
    return val.length <= 20;
}

module.exports = mongoose.model('AccountsFirebaseTokens', accountsFirebaseTokensSchema);
