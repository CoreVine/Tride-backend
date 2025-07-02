const axios = require('axios');

async function getDistanceForRide(points) {
    try {
        const { lat_lng_house, lat_lng_school } = points;

        const result = await axios.post(process.env.OPEN_ROUTES_SRVICE_URI,
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
            throw new Error(
                "Invalid coordinates provided. Please check the latitude and longitude values."
            );
        }
        throw new Error('Failed to fetch distance');
    }
}


module.exports = {
    getDistanceForRide
};
