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
                where: { account_id: accountId },
                include: [
                    {
                        association: 'papers',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    },
                    {
                        association: 'payments',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    },
                    {
                        association: 'paymentMethods',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    }
                ],
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

    async findAllPaginatedWithDetails(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const { count, rows } = await this.model.findAndCountAll({
            include: [
                {
                    association: 'papers',
                    attributes: { exclude: ['created_at', 'updated_at'] }
                },
                {
                    association: 'payments',
                    attributes: { exclude: ['created_at', 'updated_at'] }
                },
                {
                    association: 'paymentMethods',
                    attributes: { exclude: ['created_at', 'updated_at'] }
                }
            ],
            limit,
            offset,
            distinct: true
        });
        
        return { count, rows };
    }
}

module.exports = new DriverRepository();
