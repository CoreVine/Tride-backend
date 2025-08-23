const RideHistoryRepository = require("../rideHistory");
const RideInstanceLocationModel = require("../../models/RideInstanceLocation");
const BaseRepository = require("../base.repository");
const { DatabaseError, Op } = require("sequelize");
const { isLocationCloseToCheckpoint } = require("../../domain/checkpoint/detector");
const loggingService = require("../../services/logging.service");
const logger = loggingService.getLogger();

class RideInstanceLocationRepository extends BaseRepository {
  constructor() {
    super(RideInstanceLocationModel);
  }

}

module.exports = new RideInstanceLocationRepository();
