const ParentGroupRepository = require('../../data-access/parentGroup');
const GroupDaysRepository = require('../../data-access/dayDatesGroup');
const openRouteUtil = require("../../utils/openRoutesService");
const { BadRequestError } = require('../../utils/errors/types/Api.error');
const RIDE_PRICE_PER_KM = 25; // Example price per km, adjust as needed
const MAXIMUM_SEATS = 5;

// TODO: Figure out where to store the ride price per km
const calculateOverallPrice = async (details) => {
  try {
    const {
      planDetails,
      distance,
      seatsTaken,
      totalDays,
    } = details;
    let overAllPrice = (distance * 2 * RIDE_PRICE_PER_KM / MAXIMUM_SEATS) * seatsTaken;
  
    overAllPrice *= totalDays * planDetails.months_count;

    if (isNaN(overAllPrice) || overAllPrice < 0) {
      throw new BadRequestError("Invalid calculation for overall price");
    }
  
    // No discount applied - pay full amount
    const to_pay_price = overAllPrice * (1 - planDetails.discount_percentage);
  
    return {
      overallPrice: Number(overAllPrice.toFixed(2)),
      toPayPrice: Number(to_pay_price.toFixed(2))
    };
  } catch (error) {
    console.error("Error calculating overall price:", error);
    throw error;
  }
}

const getPriceFactors = async (details) => {
  const {
    rideGroupId,
    homeLocation: { homeLat, homeLng },
    parentId,
    schoolLocation: { schoolLat, schoolLng },
  } = details;
  try {
      // get all parameters required for the price calculation
      const seatsTaken = await ParentGroupRepository.getSeatsTaken(rideGroupId, parentId);

      if (seatsTaken <= 0) {
        throw new BadRequestError("No seats taken by parent in this ride group");
      }

      const totalDays = await GroupDaysRepository.countDaysInGroup(rideGroupId);
      const points = {
        lat_lng_house: [
          parseFloat(homeLng),
          parseFloat(homeLat),
        ],
        lat_lng_school: [
          parseFloat(schoolLng),
          parseFloat(schoolLat),
        ],
      };
      const oneWayDistance = await openRouteUtil.getDistanceForRide(points);

      if (isNaN(oneWayDistance) || oneWayDistance <= 0) {
        throw new BadRequestError("Invalid distance calculated for the ride");
      }

      // Calculate round trip distance (home to school and back)
      const distance = oneWayDistance * 2;

      return {
        seatsTaken,
        totalDays,
        distance
      };
  } catch (error) {
    console.error("Error getting price factors:", error);
    throw error;
  }
}

module.exports = {
  calculateOverallPrice,
  getPriceFactors
};