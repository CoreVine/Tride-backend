const RideHistoryModel = require("../../models/RideHistory");
const BaseRepository = require("../base.repository");
const { DatabaseError, Op } = require("sequelize");

class RideHistoryRepository extends BaseRepository {
  constructor() {
    super(RideHistoryModel);
  }

  async getCurrentRideHistoriesByRideInstanceId(rideInstanceId) {
    try {
      return await this.model.findAll({
        where: {
          ride_instance_id: rideInstanceId
        },
        include: [{
          association: 'deliveries'
        }]
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }
}

module.exports = new RideHistoryRepository();
