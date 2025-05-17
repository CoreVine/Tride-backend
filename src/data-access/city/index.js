const CityModel = require('../../models/City');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class CityRepository extends BaseRepository {
    constructor() {
        super(CityModel);
    }

    async exists(cityId) {
        try {
            const count = await this.model.count({
                where: { id: cityId }
            });
            return count > 0;
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findAll() {
        try {
            return await this.model.findAll({
                attributes: ['id', 'name', 'governorate_id'],
                order: [['name', 'ASC']]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
}

module.exports = new CityRepository();
