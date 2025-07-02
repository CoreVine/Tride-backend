const ParentGroupRepository = require('../../data-access/parentGroup');
const GroupDaysRepository = require('../../data-access/dayDatesGroup');
const openRouteUtil = require("../../utils/openRoutesService");
const { BadRequestError } = require('../../utils/errors/types/Api.error');
const RIDE_PRICE_PER_KM = 10; // Example price per km, adjust as needed

// TODO: Figure out where to store the ride price per km
const calculateOverallPrice = async (details) => {
  try {
    const {
      planDetails,
      distance,
      seatsTaken,
      totalDays,
    } = details;
    let overAllPrice = distance * RIDE_PRICE_PER_KM * seatsTaken * totalDays;
  
    overAllPrice *= planDetails.months_count;
  
    const afterDiscountPrice = overAllPrice * (1 - planDetails.discount_percentage);

    if (isNaN(overAllPrice) || overAllPrice < 0) {
      throw new BadRequestError("Invalid calculation for overall price");
    }
  
    let to_pay_price = afterDiscountPrice;
    if(planDetails.installment_plan) {
      to_pay_price = afterDiscountPrice / planDetails.months_count;
    }
  
    return {
      overallPrice: Number(overAllPrice.toFixed(2)),
      afterDiscountPrice: Number(afterDiscountPrice.toFixed(2)),
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
          parseFloat(homeLat),
          parseFloat(homeLng),
        ],
        lat_lng_school: [
          parseFloat(schoolLat),
          parseFloat(schoolLng),
        ],
      };
      const distance = await openRouteUtil.getDistanceForRide(points);

      if (isNaN(distance) || distance <= 0) {
        throw new BadRequestError("Invalid distance calculated for the ride");
      }

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