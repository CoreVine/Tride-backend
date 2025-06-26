const SchoolModel = require("../../models/Schools");
const BaseRepository = require("../base.repository");
const { DatabaseError } = require("sequelize");

class SchoolRepository extends BaseRepository {
  constructor() {
    super(SchoolModel);
  }
  //   async findSchoolInCity() {
  //   try {
  //     return await this.model.findByPk(id, {
  //       include: [
  //         {
  //           association: "governorate",
  //         },
  //         {
  //           association: "drivers",
  //         },
  //         {
  //           association: "schools",
  //         },
  //         {
  //           association: "parents",
  //         },
  //       ],
  //     });
  //   } catch (error) {
  //     throw new DatabaseError(error);
  //   }
  // }
}

module.exports = new SchoolRepository();
