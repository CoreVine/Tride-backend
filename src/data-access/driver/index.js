const DriverModel = require('../../models/Driver');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class DriverRepository extends BaseRepository {
    constructor() {
        super(DriverModel);
    }

    async findByAccountId(accountId) {
        try {
            return await this.model.findOne({
                where: { account_id: accountId }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findByIdWithPapers(driverId) {
        try {
            return await this.model.findByPk(driverId, {
                include: [
                    {
                        association: 'papers',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    }
                ]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findByAccountIdWithPapers(accountId) {
        try {
            return await this.model.findOne({
                where: { account_id: accountId },
                include: [
                    {
                        association: 'papers',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    }
                ]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
}

module.exports = new DriverRepository();
