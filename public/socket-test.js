// Configuration
const SERVER_URL = 'http://localhost:3007'; // Update with your server URL
console.log('Starting socket test page with server URL:', SERVER_URL);

// Driver variables
let driverSocket = null;
let driverConnected = false;
let driverJoinedRide = false;
let driverJoinInProgress = false; // Flag to prevent duplicate join attempts
let simulationInterval = null;

// Parent variables
let parentSocket = null;
let parentConnected = false;
let parentJoinedRide = false;
let parentJoinInProgress = false; // Flag to prevent duplicate join attempts

// DOM Elements - Driver
const driverStatusEl = document.getElementById('driver-status');
const driverTokenEl = document.getElementById('driver-token');
const driverConnectBtn = document.getElementById('driver-connect');
const driverDisconnectBtn = document.getElementById('driver-disconnect');
const driverJoinRideBtn = document.getElementById('driver-join-ride');
const rideGroupIdInput = document.getElementById('ride-group-id');
const driverLatEl = document.getElementById('driver-lat');
const driverLngEl = document.getElementById('driver-lng');
const driverSendLocationBtn = document.getElementById('driver-send-location');
const driverSimulateBtn = document.getElementById('driver-simulate');
const driverStopSimulationBtn = document.getElementById('driver-stop-simulation');
const driverLogEl = document.getElementById('driver-log');
const driverMarkerEl = document.getElementById('driver-marker');
const driverMapEl = document.getElementById('driver-map');

// DOM Elements - Parent
const parentStatusEl = document.getElementById('parent-status');
const parentTokenEl = document.getElementById('parent-token');
const parentConnectBtn = document.getElementById('parent-connect');
const parentDisconnectBtn = document.getElementById('parent-disconnect');
const parentJoinRideBtn = document.getElementById('parent-join-ride');
const parentLogEl = document.getElementById('parent-log');
const parentMarkerEl = document.getElementById('parent-marker');
const parentMapEl = document.getElementById('parent-map');

// Helper Functions
function logToDriver(message) {
  console.log('[DRIVER]', message);
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
  driverLogEl.appendChild(logEntry);
  driverLogEl.scrollTop = driverLogEl.scrollHeight;
}

function logToParent(message) {
  console.log('[PARENT]', message);
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
  parentLogEl.appendChild(logEntry);
  parentLogEl.scrollTop = parentLogEl.scrollHeight;
}

function updateDriverMarker(lat, lng) {
  console.log('[DRIVER] Updating marker position:', lat, lng);
  // Convert lat/lng to position on the map container
  const mapWidth = driverMapEl.clientWidth;
  const mapHeight = driverMapEl.clientHeight;
  
  // Simple mapping from lat/lng to pixel position (for demo purposes)
  // In a real app, you'd use a mapping library like Google Maps or Leaflet
  const x = ((parseFloat(lng) + 180) / 360) * mapWidth;
  const y = ((90 - parseFloat(lat)) / 180) * mapHeight;
  
  driverMarkerEl.style.left = `${x}px`;
  driverMarkerEl.style.top = `${y}px`;
  driverMarkerEl.style.display = 'block';
  
  logToDriver(`Updated marker position: ${lat}, ${lng}`);
}

function updateParentMarker(lat, lng) {
  console.log('[PARENT] Updating marker position:', lat, lng);
  const mapWidth = parentMapEl.clientWidth;
  const mapHeight = parentMapEl.clientHeight;
  
  const x = ((parseFloat(lng) + 180) / 360) * mapWidth;
  const y = ((90 - parseFloat(lat)) / 180) * mapHeight;
  
  parentMarkerEl.style.left = `${x}px`;
  parentMarkerEl.style.top = `${y}px`;
  parentMarkerEl.style.display = 'block';
  
  logToParent(`Received driver position: ${lat}, ${lng}`);
}

function simulateMovement() {
  console.log('[DRIVER] Starting movement simulation');
  const baseLatEl = driverLatEl;
  const baseLngEl = driverLngEl;
  
  return setInterval(() => {
    // Add small random movement
    const lat = parseFloat(baseLatEl.value) + (Math.random() - 0.5) * 0.01;
    const lng = parseFloat(baseLngEl.value) + (Math.random() - 0.5) * 0.01;
    
    baseLatEl.value = lat.toFixed(6);
    baseLngEl.value = lng.toFixed(6);
    
    console.log('[DRIVER] Simulated movement to:', lat, lng);
    
    // Send the simulated location
    if (driverSocket && driverJoinedRide) {
      const location = { lat, lng };
      console.log('[DRIVER] Emitting simulated location:', location);
      driverSocket.emit('driver_location_update', location);
      updateDriverMarker(lat, lng);
    } else {
      console.warn('[DRIVER] Cannot emit location - socket not ready or not joined ride');
    }
  }, 2000); // Update every 2 seconds
}

// Clean up function to properly handle disconnection
function cleanupDriverSocket() {
  if (driverSocket) {
    console.log('[DRIVER] Cleaning up socket and event listeners');
    
    // Set all states to false
    driverConnected = false;
    driverJoinedRide = false;
    driverJoinInProgress = false;
    
    // Remove all listeners before disconnecting to prevent duplicates
    driverSocket.off('connect');
    driverSocket.off('connect_error');
    driverSocket.off('disconnect');
    driverSocket.off('ack');
    driverSocket.off('error');
    
    // Release the socket reference
    driverSocket = null;
  }
}

function cleanupParentSocket() {
  if (parentSocket) {
    console.log('[PARENT] Cleaning up socket and event listeners');
    
    // Set all states to false
    parentConnected = false;
    parentJoinedRide = false;
    parentJoinInProgress = false;
    
    // Remove all listeners before disconnecting to prevent duplicates
    parentSocket.off('connect');
    parentSocket.off('connect_error');
    parentSocket.off('disconnect');
    parentSocket.off('ack');
    parentSocket.off('location_update');
    parentSocket.off('error');
    
    // Release the socket reference
    parentSocket = null;
  }
}

// Create a simple debounce function to prevent multiple rapid clicks
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Driver Socket Events
driverConnectBtn.addEventListener('click', () => {
  console.log('[DRIVER] Connect button clicked');
  
  // Prevent connecting if already connected
  if (driverConnected || driverSocket) {
    console.warn('[DRIVER] Already connected or connecting, ignoring connect request');
    return;
  }
  
  const token = driverTokenEl.value.trim();
  if (!token) {
    console.error('[DRIVER] No token provided');
    alert('Please enter a valid JWT token for the driver');
    return;
  }
  
  // Clean up any existing socket
  cleanupDriverSocket();
  
  console.log('[DRIVER] Attempting to connect to server with token');
  driverSocket = io(SERVER_URL, {
    auth: { token }
  });
  
  driverSocket.on('connect', () => {
    console.log('[DRIVER] Socket connected successfully');
    driverConnected = true;
    driverStatusEl.textContent = 'Connected';
    driverStatusEl.className = 'status connected';
    
    driverConnectBtn.disabled = true;
    driverDisconnectBtn.disabled = false;
    driverJoinRideBtn.disabled = false;
    
    logToDriver('Connected to server');
  });
  
  driverSocket.on('connect_error', (error) => {
    console.error('[DRIVER] Socket connection error:', error);
    logToDriver(`Connection error: ${error.message}`);
  });
  
  driverSocket.on('disconnect', (reason) => {
    console.log('[DRIVER] Socket disconnected, reason:', reason);
    driverConnected = false;
    driverJoinedRide = false;
    driverStatusEl.textContent = 'Disconnected';
    driverStatusEl.className = 'status disconnected';
    
    driverConnectBtn.disabled = false;
    driverDisconnectBtn.disabled = true;
    driverJoinRideBtn.disabled = true;
    driverSendLocationBtn.disabled = true;
    driverSimulateBtn.disabled = true;
    driverStopSimulationBtn.disabled = true;
    
    if (simulationInterval) {
      console.log('[DRIVER] Clearing simulation interval due to disconnect');
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    
    logToDriver('Disconnected from server');
  });
  
  driverSocket.on('ack', (message) => {
    console.log('[DRIVER] Received acknowledgment:', message);
    logToDriver(`Received acknowledgment: ${message}`);
    
    // Clear the join in progress flag regardless of outcome
    driverJoinInProgress = false;
    
    if (message.startsWith('OK:')) {
      driverJoinedRide = true;
      driverSendLocationBtn.disabled = false;
      driverSimulateBtn.disabled = false;
      console.log('[DRIVER] Successfully joined ride');
      logToDriver('Successfully joined ride');
    } else {
      // Enable the join button again if the request failed
      driverJoinRideBtn.disabled = false;
    }
  });
  
  driverSocket.on('error', (error) => {
    console.error('[DRIVER] Socket error:', error);
    logToDriver(`Error: ${error}`);
  });
});

driverDisconnectBtn.addEventListener('click', () => {
  console.log('[DRIVER] Disconnect button clicked');
  if (driverSocket) {
    driverSocket.disconnect();
    console.log('[DRIVER] Disconnect requested');
    
    // Clean up the socket and event listeners
    cleanupDriverSocket();
    
    driverConnected = false;
    driverJoinedRide = false;
    driverStatusEl.textContent = 'Disconnected';
    driverStatusEl.className = 'status disconnected';
    
    driverConnectBtn.disabled = false;
    driverDisconnectBtn.disabled = true;
    driverJoinRideBtn.disabled = true;
    driverSendLocationBtn.disabled = true;
    driverSimulateBtn.disabled = true;
    driverStopSimulationBtn.disabled = true;
    
    if (simulationInterval) {
      console.log('[DRIVER] Clearing simulation interval due to disconnect');
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  } else {
    console.warn('[DRIVER] Disconnect clicked but socket is null');
  }
});

// Use debounce and add extra checks to prevent multiple join attempts
driverJoinRideBtn.addEventListener('click', debounce(function() {
  console.log('[DRIVER] Join ride button clicked');
  
  // Check if already joined or join in progress
  if (driverJoinedRide) {
    console.warn('[DRIVER] Already joined a ride, ignoring request');
    return;
  }
  
  if (driverJoinInProgress) {
    console.warn('[DRIVER] Join request already in progress, ignoring duplicate');
    return;
  }
  
  if (driverSocket && driverConnected) {
    const rideGroupId = parseInt(rideGroupIdInput.value);
    if (isNaN(rideGroupId) || rideGroupId < 1) {
      console.error('[DRIVER] Invalid ride group ID:', rideGroupIdInput.value);
      alert('Please enter a valid ride group ID');
      return;
    }
    
    // Set join in progress flag
    driverJoinInProgress = true;
    driverJoinRideBtn.disabled = true;
    
    console.log('[DRIVER] Emitting driver_join_ride event with group ID:', rideGroupId);
    driverSocket.emit('driver_join_ride', rideGroupId);
    logToDriver(`Requested to join ride group: ${rideGroupId}`);
    
    // Add a timeout to reset the flag if no response
    setTimeout(() => {
      if (driverJoinInProgress && !driverJoinedRide) {
        console.warn('[DRIVER] Join request timed out, resetting state');
        driverJoinInProgress = false;
        driverJoinRideBtn.disabled = false;
      }
    }, 5000); // 5 second timeout
  } else {
    console.warn('[DRIVER] Cannot join ride - socket not connected');
  }
}, 300)); // 300ms debounce

driverSendLocationBtn.addEventListener('click', () => {
  console.log('[DRIVER] Send location button clicked');
  if (driverSocket && driverJoinedRide) {
    const lat = parseFloat(driverLatEl.value);
    const lng = parseFloat(driverLngEl.value);
    
    if (isNaN(lat) || isNaN(lng)) {
      console.error('[DRIVER] Invalid lat/lng values:', driverLatEl.value, driverLngEl.value);
      alert('Please enter valid latitude and longitude values');
      return;
    }
    
    const location = { lat, lng };
    console.log('[DRIVER] Sending location update:', location);
    driverSocket.emit('driver_location_update', location);
    updateDriverMarker(lat, lng);
    logToDriver(`Sent location: ${lat}, ${lng}`);
  } else {
    console.warn('[DRIVER] Cannot send location - socket not ready or not joined ride');
  }
});

driverSimulateBtn.addEventListener('click', () => {
  console.log('[DRIVER] Simulate button clicked');
  if (driverJoinedRide) {
    simulationInterval = simulateMovement();
    driverSimulateBtn.disabled = true;
    driverStopSimulationBtn.disabled = false;
    console.log('[DRIVER] Started location simulation');
    logToDriver('Started location simulation');
  } else {
    console.warn('[DRIVER] Cannot start simulation - not joined ride');
  }
});

driverStopSimulationBtn.addEventListener('click', () => {
  console.log('[DRIVER] Stop simulation button clicked');
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    driverSimulateBtn.disabled = false;
    driverStopSimulationBtn.disabled = true;
    console.log('[DRIVER] Stopped location simulation');
    logToDriver('Stopped location simulation');
  } else {
    console.warn('[DRIVER] Cannot stop simulation - no active simulation');
  }
});

// Parent Socket Events
parentConnectBtn.addEventListener('click', () => {
  console.log('[PARENT] Connect button clicked');
  
  // Prevent connecting if already connected
  if (parentConnected || parentSocket) {
    console.warn('[PARENT] Already connected or connecting, ignoring connect request');
    return;
  }
  
  const token = parentTokenEl.value.trim();
  if (!token) {
    console.error('[PARENT] No token provided');
    alert('Please enter a valid JWT token for the parent');
    return;
  }
  
  // Clean up any existing socket
  cleanupParentSocket();
  
  console.log('[PARENT] Attempting to connect to server with token');
  parentSocket = io(SERVER_URL, {
    auth: { token }
  });
  
  parentSocket.on('connect', () => {
    console.log('[PARENT] Socket connected successfully');
    parentConnected = true;
    parentStatusEl.textContent = 'Connected';
    parentStatusEl.className = 'status connected';
    
    parentConnectBtn.disabled = true;
    parentDisconnectBtn.disabled = false;
    parentJoinRideBtn.disabled = false;
    
    logToParent('Connected to server');
  });
  
  parentSocket.on('connect_error', (error) => {
    console.error('[PARENT] Socket connection error:', error);
    logToParent(`Connection error: ${error.message}`);
  });
  
  parentSocket.on('disconnect', (reason) => {
    console.log('[PARENT] Socket disconnected, reason:', reason);
    parentConnected = false;
    parentJoinedRide = false;
    parentStatusEl.textContent = 'Disconnected';
    parentStatusEl.className = 'status disconnected';
    
    parentConnectBtn.disabled = false;
    parentDisconnectBtn.disabled = true;
    parentJoinRideBtn.disabled = true;
    
    logToParent('Disconnected from server');
  });
  
  parentSocket.on('ack', (message) => {
    console.log('[PARENT] Received acknowledgment:', message);
    logToParent(`Received acknowledgment: ${message}`);
    
    // Handle location acknowledgments separately from join acknowledgments
    if (message.startsWith('LOCATION:')) {
      // Parse the location data from the acknowledgment
      try {
        const locationStr = message.substring('LOCATION:'.length);
        const locationData = JSON.parse(locationStr);
        console.log('[PARENT] Received initial location in ack:', locationData);
        
        // Update the parent map with the initial location
        if (locationData && typeof locationData.lat === 'number' && typeof locationData.lng === 'number') {
          updateParentMarker(locationData.lat, locationData.lng);
        }
      } catch (e) {
        console.error('[PARENT] Error parsing location data from ack:', e);
      }
      return; // Skip the rest of the handler for location acks
    }
    
    // Clear the join in progress flag regardless of outcome
    parentJoinInProgress = false;
    
    if (message.startsWith('OK:')) {
      parentJoinedRide = true;
      console.log('[PARENT] Successfully joined ride watch');
      logToParent('Successfully joined ride watch');
    } else {
      // Enable the join button again if the request failed
      parentJoinRideBtn.disabled = false;
    }
  });
  
  parentSocket.on('location_update', (locationData) => {
    console.log('[PARENT] Received location update:', locationData);
    logToParent(`Received location update: ${JSON.stringify(locationData)}`);
    updateParentMarker(locationData.lat, locationData.lng);
  });
  
  parentSocket.on('error', (error) => {
    console.error('[PARENT] Socket error:', error);
    logToParent(`Error: ${error}`);
  });
});

parentDisconnectBtn.addEventListener('click', () => {
  console.log('[PARENT] Disconnect button clicked');
  if (parentSocket) {
    parentSocket.disconnect();
    console.log('[PARENT] Disconnect requested');
    
    // Clean up the socket and event listeners
    cleanupParentSocket();
    
    parentConnected = false;
    parentJoinedRide = false;
    parentStatusEl.textContent = 'Disconnected';
    parentStatusEl.className = 'status disconnected';
    
    parentConnectBtn.disabled = false;
    parentDisconnectBtn.disabled = true;
    parentJoinRideBtn.disabled = true;
  } else {
    console.warn('[PARENT] Disconnect clicked but socket is null');
  }
});

// Use debounce and add extra checks to prevent multiple join attempts
parentJoinRideBtn.addEventListener('click', debounce(function() {
  console.log('[PARENT] Watch ride button clicked');
  
  // Check if already joined or join in progress
  if (parentJoinedRide) {
    console.warn('[PARENT] Already watching a ride, ignoring request');
    return;
  }
  
  if (parentJoinInProgress) {
    console.warn('[PARENT] Watch request already in progress, ignoring duplicate');
    return;
  }
  
  if (parentSocket && parentConnected) {
    const rideGroupId = parseInt(rideGroupIdInput.value);
    if (isNaN(rideGroupId) || rideGroupId < 1) {
      console.error('[PARENT] Invalid ride group ID:', rideGroupIdInput.value);
      alert('Please enter a valid ride group ID');
      return;
    }
    
    // Set join in progress flag
    parentJoinInProgress = true;
    parentJoinRideBtn.disabled = true;
    
    console.log('[PARENT] Emitting parent_watch_ride event with group ID:', rideGroupId);
    parentSocket.emit('parent_watch_ride', rideGroupId);
    logToParent(`Requested to watch ride group: ${rideGroupId}`);
    
    // Add a timeout to reset the flag if no response
    setTimeout(() => {
      if (parentJoinInProgress && !parentJoinedRide) {
        console.warn('[PARENT] Watch request timed out, resetting state');
        parentJoinInProgress = false;
        parentJoinRideBtn.disabled = false;
      }
    }, 5000); // 5 second timeout
  } else {
    console.warn('[PARENT] Cannot watch ride - socket not connected');
  }
}, 300)); // 300ms debounce
