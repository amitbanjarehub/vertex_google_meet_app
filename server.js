const express = require("express");
require("dotenv").config(); // Load environment variables
const cors = require("cors"); // Import the CORS package

const path = require("path");
const app = express();

// Use the PORT value from the .env file, or default to 3000 if not set
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes or specify domains you trust
app.use(cors({
  origin: ['http://localhost:3000', 'https://scanist.organicorion.com'], // Specify your frontend domains
  methods: ['GET', 'POST']
}));

var server = app.listen(PORT, function () {
  console.log(`listening on port ${PORT}`);
});

// Initialize Socket.io with the server and allow WebSockets and polling
const io = require("socket.io")(server, {
  allowEIO3: true, // This is for compatibility with older Socket.io clients
  cors: {
    origin: ['http://localhost:3000', 'https://scanist.organicorion.com'], // Allow frontend domains
    methods: ['GET', 'POST']
  }
});

app.use(express.static(path.join(__dirname, "")));

// Array to store user connections
var userConnections = [];

// Handle new socket connections
io.on("connection", (socket) => {
  console.log(`socket id is ${socket.id}`);

  // Event listener for user connection
  socket.on("userconnect", (data) => {
    console.log("userconnect", data.displayName, data.meetingid);

    // Filter connections based on the meeting ID
    var other_users = userConnections.filter(
      (p) => p.meeting_id == data.meetingid
    );

    // Add the new connection to the list
    userConnections.push({
      connectionId: socket.id,
      user_id: data.displayName,
      meeting_id: data.meetingid,
    });

    // Inform other users in the meeting about the new connection
    other_users.forEach((v) => {
      socket.to(v.connectionId).emit("inform_others_about_me", {
        other_user_id: data.displayName,
        connId: socket.id,
      });
    });

    // Send information about other users to the new user
    socket.emit("inform_me_about_other_user", other_users);
  });

  // Event listener for SDP (Session Description Protocol) process
  socket.on("SDPProcess", (data) => {
    socket.to(data.to_connid).emit("SDPProcess", {
      message: data.message,
      from_connid: socket.id,
    });
  });

  // Optional: Handle socket disconnection
  socket.on("disconnect", () => {
    console.log(`User with socket id ${socket.id} disconnected`);
    userConnections = userConnections.filter(
      (user) => user.connectionId !== socket.id
    );
  });
});
