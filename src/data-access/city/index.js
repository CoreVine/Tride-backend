const CityModel = require("../../models/City");
const BaseRepository = require("../base.repository");
const { DatabaseError, Op } = require("sequelize");

class CityRepository extends BaseRepository {
  constructor() {
    super(CityModel);
  }

  async exists(cityId) {
    try {
      const count = await this.model.count({
        where: { id: cityId },
      });
      return count > 0;
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findAll() {
    try {
      return await this.model.findAll({
        attributes: ["id", "name", "governorate_id"],
        order: [["name", "ASC"]],
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findByName(name) {
    try {
      return await this.model.findAll({
        where: {
          name: {
            [Op.like]: `%${name}%`,
          },
        },
        attributes: ["id", "name", "governorate_id"],
        order: [["name", "ASC"]],
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findByIdWithParentsDriversSchools(id) {
    try {
      return await this.model.findByPk(id, {
        include: [
          {
            association: "governorate",
          },
          {
            association: "drivers",
          },
          {
            association: "schools",
          },
          {
            association: "parents",
          },
        ],
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }
}

module.exports = new CityRepository();
