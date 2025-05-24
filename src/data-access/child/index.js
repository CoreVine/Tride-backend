const ChildModel = require("../../models/Child");
const BaseRepository = require("../base.repository");
const { DatabaseError } = require("sequelize");

class ChildRepository extends BaseRepository {
  constructor() {
    super(ChildModel);
  }
}

module.exports = new ChildRepository();
