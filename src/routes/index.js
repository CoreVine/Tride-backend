// src/routes/index.js
const { Router } = require('express');
const fs = require('fs');
const path = require('path');

const ChatRoom = require('../mongo-model/ChatRoom')

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

router.get('/creating-test', async (req, res, next) => {
  try {
    const c = new ChatRoom({
      ride_group_id: 1001,
      name: "Chat Room For Testing",
      room_type: "ride_group",
      participants: [
        { user_id: 1002, name: "ParentName", user_type: "parent" },
        { user_id: 1003, name: "ParentName", user_type: "parent" },
        { user_id: 1001, name: "DriverName", user_type: "driver" }
      ]
    })
    c.save()
    res.status(200).json({ status: c });
  } catch (error) {
    return next(error)
  }
});

// Default route
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the API' });
});

// Recursively load all route files from all subdirectories
const loadRoutesRecursively = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      // If it's a directory, recursively load routes from it
      loadRoutesRecursively(fullPath);
    } else if (
      file.indexOf('.') !== 0 && 
      file !== path.basename(__filename) && 
      file.slice(-3) === '.js'
    ) {
      // If it's a valid route file, load it
      const route = require(fullPath);
      router.use(route);
    }
  });
};

// Start loading routes from the current directory
loadRoutesRecursively(__dirname);

module.exports = router;