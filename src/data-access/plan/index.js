const PlanModel = require('../../models/Plan');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class PlanRepository extends BaseRepository {
    constructor() {
        super(PlanModel);
    }

    async getPlanByType(planType) {
        try {
            return await this.model.findOne({
                where: {
                    range: planType
                }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async getAllPlans() {
        return await this.model.findAll();
    }
}

module.exports = new PlanRepository();
