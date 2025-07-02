const PlanModel = require('../../models/Plan');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class PlanRepository extends BaseRepository {
    constructor() {
        super(PlanModel);
    }

    async getPlanByType(planType, installmentPlan = false) {
        try {
            return await this.model.findOne({
                where: {
                    range: planType,
                    installment_plan: installmentPlan
                }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async getAllPlans() {
        return await this.model.findAll({
            where: {
                installment_plan: false
            }
        });
    }
}

module.exports = new PlanRepository();
