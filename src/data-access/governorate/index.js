const GovernorateModel = require("../../models/Governorate");
const BaseRepository = require("../base.repository");
const { DatabaseError } = require("sequelize");

class GovernorateRepository extends BaseRepository {
  constructor() {
    super(GovernorateModel);
  }

  /**
   * Find countries by name (partial match)
   * @param {String} governorate_name - The name to search for
   * @returns {Promise<Array>} Matching countries
   */
  async findByName(governorate_name) {
    try {
      return await this.model.findAll({
        where: {
          governorate_name: {
            [Op.like]: `%${governorate_name}%`,
          },
        },
        order: [["governorate_name", "ASC"]],
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  /**
   * Get a single country with all its cities
   * @param {Number} id - Country ID
   * @returns {Promise<Object>} Country with cities
   */
  async findByIdWithCities(id) {
    try {
      return await this.model.findByPk(id, {
        include: [
          {
            association: "cities",
            order: [["name", "ASC"]],
          },
        ],
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  /**
   * Delete a country and all its cities if they don't have hotels
   * @param {Number} id - The country ID to delete
   * @returns {Promise<Object>} Result with delete count and message
   */
  async deleteWithCities(id) {
    let transaction;
    try {
      const sequelize = this.model.sequelize;
      transaction = await sequelize.transaction();

      // Get country with cities
      const countryWithCities = await this.findByIdWithCities(id, {
        transaction,
      });

      if (!countryWithCities) {
        throw new Error("Country not found");
      }

      const cityIds = countryWithCities.cities.map((city) => city.id);
      let citiesDeleted = 0;

      if (cityIds.length > 0) {
        // Find all hotels for these cities
        const hotels = await sequelize.models.Hotel.findAll({
          where: { city_id: { [Op.in]: cityIds } },
          transaction,
        });

        if (hotels.length > 0) {
          throw new Error(
            `Cannot delete country because ${hotels.length} hotels are associated with its cities`
          );
        }

        // Delete all cities
        citiesDeleted = await sequelize.models.City.destroy({
          where: { id: { [Op.in]: cityIds } },
          transaction,
        });
      }

      // Delete the country
      await this.delete(id, { transaction });

      await transaction.commit();

      return {
        success: true,
        citiesDeleted,
        message: `Country deleted successfully along with ${citiesDeleted} cities`,
      };
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw new DatabaseError(error);
    }
  }
}

module.exports = new GovernorateRepository();
