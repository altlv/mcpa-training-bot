// src/server.js
// This is our Express server - the heart of our MCPA Training Bot!

// Step 1: Import Express
// require() is how Node.js loads modules
// We're importing the express package we just installed
const express = require('express');

// Step 2: Create an Express application
// app is our server object - we use it to define routes and settings
const app = express();

// Step 3: Define the port
// process.env.PORT allows hosting services to set the port
// We default to 3000 for local development
const PORT = process.env.PORT || 3000;

// Step 4: Define a route
// When someone visits http://localhost:3000/, this function runs
// req = request (what the client sent)
// res = response (what we send back)
app.get('/', (req, res) => {
  res.send('🤖 MCPA Training Bot is running! Day 1 complete!');
});

// Step 5: Start the server
// app.listen() starts the server and listens for connections
// The callback function runs once the server is ready
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`📚 MCPA Training Bot - Day 1`);
  console.log(`💡 Press Ctrl+C to stop the server`);
});
