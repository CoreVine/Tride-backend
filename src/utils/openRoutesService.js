const axios = require("axios");
const { BadRequestError } = require("./errors");
const logger = require("../services/logging.service").getLogger();

async function getDistanceForRide(points) {
  try {
    const { lat_lng_house, lat_lng_school } = points;

    const result = await axios.post(
      process.env.OPEN_ROUTES_SERVICE_URI,
      {
        locations: [lat_lng_house, lat_lng_school],
        metrics: ["distance"],
      },
      {
        headers: {
          Authorization: process.env.OPEN_ROUTES_SERVICE_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const { distances } = result.data;
    const distanceInMeters = distances[0][1];
    const distanceInKm = distanceInMeters / 1000;

    return distanceInKm;
  } catch (error) {
    console.error(
      "Error fetching distance from Open Routes Service:",
      error?.response?.data?.error?.message
    );
    if (
      error.response &&
      error.response.data &&
      error.response.data.error &&
      error.response.data.error.code === 6010
    ) {
      throw new BadRequestError(
        "Invalid coordinates provided. Please check the latitude and longitude values."
      );
    }
    throw new BadRequestError("Failed to fetch distance");
  }
}

async function getOptimizedRouteWithSteps(
  driver,
  houses,
  school,
  direction = "to_school"
) {
  try {
    const isToSchool = direction === "to_school";

    const jobs = houses.map((house, index) => ({
      id: index + 1,
      service: 300,
      [isToSchool ? "pickup" : "delivery"]: [1],
      location: [house.lng, house.lat], // lng, lat
      metadata: {
        type: "child",
        id: house.parent_id,
        children: house.children || [],
      },
    }));

    const vehicle = {
      id: 1,
      profile: "driving-car",
      start: [driver.lng, driver.lat],
      capacity: [houses.length],
      skills: [1],
      metadata: {
        type: "garage",
        id: driver.id,
      },
    };

    if (isToSchool) {
      vehicle.end = [school.lng, school.lat];
    }

    const response = await axios.post(
      "https://api.openrouteservice.org/optimization",
      {
        jobs,
        vehicles: [vehicle],
      },
      {
        headers: {
          Authorization: process.env.OPEN_ROUTES_SERVICE_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const steps = response.data.routes[0].steps;

    const orderedRoute = [];
    orderedRoute.push({
      lat: driver.lat,
      lng: driver.lng,
      type: "driver",
      id: driver.id,
    });

    if (!isToSchool) {
      orderedRoute.push({
        lat: school.lat,
        lng: school.lng,
        type: "school",
        id: school.id,
        children: houses.flatMap((house) => house.children || []),
      });
    }

    steps.forEach((step) => {
      if (step.type === "job") {
        const jobMeta = jobs.find((job) => job.id === step.job)?.metadata;
        orderedRoute.push({
          lat: step.location[1],
          lng: step.location[0],
          type: jobMeta?.type,
          id: jobMeta?.id,
          children: jobMeta?.children || [],
        });
      }
    });

    if (isToSchool) {
      orderedRoute.push({
        lat: school.lat,
        lng: school.lng,
        type: "school",
        id: school.id,
        children: houses.flatMap((house) => house.children || []),
      });
    }

    return orderedRoute;
  } catch (error) {
    logger.warn(
      `Error fetching optimized route from Open Routes Service: ${error.response?.data?.error || error}`
    );
    throw new BadRequestError(
      `Failed to get optimized route: ${error.response?.data?.error || error}`
    );
  }
}

module.exports = {
  getDistanceForRide,
  getOptimizedRouteWithSteps,
};
