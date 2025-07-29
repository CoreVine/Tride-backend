const RideInstanceModel = require("../../models/RideInstance");
const BaseRepository = require("../base.repository");
const { DatabaseError, Op } = require("sequelize");

class RideInstanceRepository extends BaseRepository {
  constructor() {
    super(RideInstanceModel);
  }

  async findActiveInstanceByRideGroupId(rideGroupId, driverId) {
    try {      
      return await this.model.findOne({
        where: {
          driver_id: driverId,
          group_id: rideGroupId,
          status: {
            [Op.in]: ["started", "active"]
          }
        }
      });
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  async findActiveInstanceByDriverId(driverId) {
    try {      
      return await this.model.findOne({
        where: {
          driver_id: driverId,
          status: {
            [Op.in]: ["started", "active"]
          }
        }
      });
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }
  async findActiveInstanceByParentId(parentId) {
    try {      
      return await this.model.findOne({
        where: {
          status: {
            [Op.in]: ["started", "active"]
          }
        },
        include: [
          {
            association: "group",
            where: {
              "$parentGroups.parent_id$": parentId
            },
            include: [
              {
                association: "parentGroups",
                required: true,
              }
            ]
          }
        ]
      });
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }
}

module.exports = new RideInstanceRepository();
