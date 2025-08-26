const DriverPaymentModel = require('../../models/DriverPayment');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class DriverPaymentRepository extends BaseRepository {
    constructor() {
        super(DriverPaymentModel);
    }

    async findAllByDriverId(driverId) {
        try {
            return await this.model.findAll({
                where: { driver_id: driverId },
                order: [['issued_at', 'DESC']]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

  
}

module.exports = new DriverPaymentRepository();
