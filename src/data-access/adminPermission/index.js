const AdminPermissionModel = require("../../models/AdminPermission")
const BaseRepository = require("../base.repository")
const { DatabaseError, Op } = require("sequelize")

class AdminPermissionRepository extends BaseRepository {
  constructor() {
    super(AdminPermissionModel)
  }

  async findAll() {
    try {
      const permissions = await this.model.findAll({
        order: [["created_at", "DESC"]]
      })
      return permissions
    } catch (error) {
      throw new DatabaseError(error)
    }
  }
}

module.exports = new AdminPermissionRepository()
