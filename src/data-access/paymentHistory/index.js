const PaymentHistory = require('../../models/PaymentHistory');
const BaseRepository = require('../base.repository');

class PaymentHistoryRepository extends BaseRepository {
    constructor() {
        super(PaymentHistory);
    }
}

module.exports = new PaymentHistoryRepository();
