function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function isLocationCloseToCheckpoint({ location_lat, location_lng }, { checkpoint_lat, checkpoint_lng }, threshold_meters = 50) {
    const R = 6371000; // Radius of the Earth in meters
    const lat1 = toRadians(location_lat);
    const lat2 = toRadians(checkpoint_lat);
    const deltaLat = toRadians(checkpoint_lat - location_lat);
    const deltaLng = toRadians(checkpoint_lng - location_lng);

    const a = Math.min(1, 
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
    );
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    console.log(distance);
    

    return distance <= threshold_meters;    
}

function getDistanceBetweenLocations({ location_lat, location_lng }, { checkpoint_lat, checkpoint_lng }) {
    const R = 6371000; // Radius of the Earth in meters
    const lat1 = toRadians(location_lat);
    const lat2 = toRadians(checkpoint_lat);
    const deltaLat = toRadians(checkpoint_lat - location_lat);
    const deltaLng = toRadians(checkpoint_lng - location_lng);

    const a = Math.min(1, 
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
    );
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters

    return distance;
}

module.exports = {
    isLocationCloseToCheckpoint,
    getDistanceBetweenLocations   
}
