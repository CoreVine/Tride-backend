const RideGroupRepository = require("../data-access/rideGroup");
const RideInstanceRepository = require("../data-access/rideInstance");
const { BadRequestError, NotFoundError } = require("../utils/errors");
const loggingService = require("../services/logging.service");
const logger = loggingService.getLogger();
const { MAX_SEATS_CAR } = require("../config/upload/constants");

const rideController = {
    createRideInstance: async (req, res, next) => {
        const { ride_group_id, type } = req.body;
        const driver_id = req.account.driver.id;

        try {
            const rideGroup = await RideGroupRepository.findOneIfDriver(ride_group_id, driver_id);

            if (!rideGroup) {
                throw new NotFoundError("Ride group is not found");
            }

            // check if there is a ride instance currently in operation
            const rideInstance = await RideInstanceRepository.findActiveInstanceByRideGroupId(ride_group_id, driver_id);

            if (rideInstance) {
                return res.success("a ride instance is already created!", {
                    rideInstance
                });
            }

            if (rideGroup.current_seats_taken !== MAX_SEATS_CAR) {
                throw new BadRequestError(`Cannot start a ride on a group that is not ${MAX_SEATS_CAR} members!`);
            }

            // create a new ride instance
            const newRideInstance = await RideInstanceRepository.create({
                type,
                driver_id,
                group_id: ride_group_id
            });

            return res.success("Created a new ride instance", {
                rideInstance: newRideInstance
            });

        } catch (error) {
            logger.error(`Error creating ride instance: ${error.message}`);
            next(error);
        }
    }
};

module.exports = rideController;
