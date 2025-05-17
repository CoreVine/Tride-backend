const GovernorateModel = require('../../models/Governorate');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class GovernorateRepository extends BaseRepository {
    constructor() {
        super(GovernorateModel);
    }

    async findAll() {
        try {
            return await this.model.findAll({
                attributes: ['id', 'governorate_name'],
                order: [['governorate_name', 'ASC']]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
}

module.exports = new GovernorateRepository();
