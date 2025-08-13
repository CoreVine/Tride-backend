const axios = require('axios');
const { BadRequestError } = require('./errors');

async function getDistanceForRide(points) {
    try {
        const { lat_lng_house, lat_lng_school } = points;

        const result = await axios.post(process.env.OPEN_ROUTES_SERVICE_URI,
            {
                "locations": [
                    lat_lng_house,
                    lat_lng_school
                ],
                "metrics": ["distance"],
                "units": "km"
            }, 
            {
                headers: {
                  'Authorization': process.env.OPEN_ROUTES_SERVICE_KEY,
                  'Content-Type': 'application/json'
                }
            }
        );
    
        const { distances } = result.data;
    
        return distances[0][1]; // Return one-way distance from house to school (will be doubled for round trip)
    }  catch (error) {
        console.error('Error fetching distance from Open Routes Service:', error.response.data.error.message);
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
        throw new BadRequestError('Failed to fetch distance');
    }
}

async function getOptimizedRouteWithSteps(
    driver,
    houses,
    school,
    direction = "to_school") {
    try {
        const isToSchool = direction === "to_school";
        
        // 1. Construct jobs - only house jobs, school handled manually
        const jobs = houses.map((house, index) => ({
            id: index + 1,
            service: 300,
            [isToSchool ? "pickup" : "delivery"]: [1],
            location: [house.lng, house.lat],
            metadata: {
                type: "child",
                id: house.parent_id,
                children: house.children || [] // Include children data
            }
        }));

        // 2. Construct vehicle
        const vehicle = {
            id: 1,
            profile: "driving-car",
            start: [driver.lng, driver.lat],
            capacity: [houses.length],
            skills: [1],
            metadata: {
                type: "garage",
                id: driver.id
            }
        };

        if (isToSchool) {
            vehicle.end = [school.lng, school.lat];
        }

        // 3. Call optimization API
        const response = await axios.post(
            "https://api.openrouteservice.org/optimization",
            {
                jobs,
                vehicles: [vehicle]
            },
            {
                headers: {
                    Authorization: process.env.OPEN_ROUTES_SERVICE_KEY,
                    "Content-Type": "application/json"
                }
            }
        );

        const steps = response.data.routes[0].steps;

        // 4. Build final response - manually construct proper order
        const orderedRoute = [];
        
        // Always start with driver
        orderedRoute.push({
            lat: driver.lat,
            lng: driver.lng,
            type: "driver",
            id: driver.id
        });

        if (!isToSchool) {
            // For to_home: driver -> school -> optimized children
            orderedRoute.push({
                lat: school.lat,
                lng: school.lng,
                type: "school",
                id: school.id
            });
        }

        // Add optimized job steps (children)
        steps.forEach((step) => {
            if (step.type === "job") {
                const jobMeta = jobs.find(job => job.id === step.job)?.metadata;
                orderedRoute.push({
                    lat: step.location[1],
                    lng: step.location[0],
                    type: jobMeta?.type,
                    id: jobMeta?.id,
                    children: jobMeta?.children || [] // Include children in route
                });
            }
        });

        if (isToSchool) {
            // For to_school: driver -> optimized children -> school
            orderedRoute.push({
                lat: school.lat,
                lng: school.lng,
                type: "school",
                id: school.id
            });
        }

        return orderedRoute;

    } catch (error) {
        console.error('Error fetching optimized route from Open Routes Service:', error.response.data?.error);
        throw new BadRequestError(`Failed to get optimized route: ${error.response.data?.error}`);
    }
}

module.exports = {
    getDistanceForRide,
    getOptimizedRouteWithSteps
};
