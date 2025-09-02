/**
 * Socket.IO Server for Real-time Collaboration
 * This server handles real-time communication between users for collaborative coding sessions.
 * Features include room management, code synchronization, and chat functionality.
 */

const express = require("express");
const app = express();
const http = require("http").createServer(app);

// Configure Socket.IO with CORS settings to allow cross-origin requests
const io = require("socket.io")(http, {
  cors: {
    origin: "*", // Allow connections from any origin
    methods: ["GET", "POST"], // Allow only GET and POST methods
  },
});

// In-memory data structures for managing rooms and invites
const rooms = new Map(); // Stores active collaboration rooms and their participants
const pendingInvites = new Map(); // Stores pending collaboration invites

/**
 * Handle new socket connections and set up event listeners
 */
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  /**
   * Handle collaboration invite requests
   * Creates a new room and sends invite to other users
   * @param {Object} inviteData - Contains invite details including title and recipients
   */
  socket.on("send-invite", (inviteData) => {
    console.log("Invite received:", inviteData);

    // Generate unique IDs for both invite and room using timestamp and random string
    const inviteId = Date.now();
    const roomId = `room_${inviteId}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Enrich the invite data with additional metadata
    const enrichedData = {
      ...inviteData,
      senderId: socket.id,
      id: inviteId,
      roomId: roomId,
      timestamp: new Date().toISOString(),
    };

    console.log("Creating new room:", roomId);

    // Initialize new room with required metadata
    const newRoom = {
      users: new Set(), // Using Set to ensure unique users
      problemTitle: inviteData.title,
      createdBy: socket.id,
      createdAt: new Date().toISOString(),
    };
    rooms.set(roomId, newRoom);

    // Store the pending invite with room information
    pendingInvites.set(inviteId, {
      ...enrichedData,
      roomId,
      status: "pending",
    });

    console.log("Current rooms:", Array.from(rooms.keys()));
    console.log("Current pending invites:", Array.from(pendingInvites.keys()));

    // Broadcast to all users except sender
    socket.broadcast.emit("receive-invite", enrichedData);
  });

  socket.on("join-room", ({ roomId, userId, username, problemTitle }) => {
    console.log(`User ${username} attempting to join room ${roomId}`);

    socket.join(roomId);

    if (!rooms.has(roomId)) {
      console.log(`Room ${roomId} not found, creating new room`);
      rooms.set(roomId, {
        users: new Set(),
        problemTitle: problemTitle,
        createdBy: socket.id,
        createdAt: new Date().toISOString(),
      });
    }

    const room = rooms.get(roomId);
    const userInfo = { userId, username, socketId: socket.id };
    room.users.add(userInfo);

    console.log(
      `User ${username} joined room ${roomId}. Current users:`,
      Array.from(room.users).map((u) => u.username)
    );

    const users = Array.from(room.users);
    io.to(roomId).emit("room-joined", {
      roomId,
      username,
      problemTitle: room.problemTitle,
      users,
    });

    socket.to(roomId).emit("user-joined", { userId, username });
  });

  socket.on("code-update", ({ roomId, code, language }) => {
    socket.to(roomId).emit("code-update", { code, language });
  });

  socket.on("send-message", ({ roomId, message, username }) => {
    io.to(roomId).emit("room-message", {
      message,
      username,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("leave-room", ({ roomId, userId }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.delete(userId);

      if (room.size === 0) {
        rooms.delete(roomId);
      }

      socket.to(roomId).emit("user-left", { userId });
    }
    socket.leave(roomId);
  });

  socket.on("accept-invite", ({ inviteId, senderId, title }) => {
    console.log(`Processing invite acceptance for invite ${inviteId}`);

    const invite = pendingInvites.get(inviteId);
    if (invite) {
      const roomId = invite.roomId;
      console.log(`Found invite. Associated room: ${roomId}`);

      if (!rooms.has(roomId)) {
        console.log(`Room ${roomId} not found, creating new room`);
        rooms.set(roomId, {
          users: new Set(),
          problemTitle: title || invite.title,
          createdBy: invite.senderId,
          createdAt: new Date().toISOString(),
        });
      }

      io.to(senderId).emit("invite-accepted", {
        roomId: roomId,
        acceptedBy: socket.id,
        problemTitle: title || invite.title,
      });
      pendingInvites.delete(inviteId);
    }
  });

  /**
   * Handle user leaving a room
   * Removes user from room and notifies other participants
   * @param {Object} params - Room leaving parameters
   * @param {string} params.roomId - Room identifier
   * @param {string} params.userId - User's unique identifier
   */
  socket.on("leave-room", ({ roomId, userId }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      // Find user by either userId or socket.id for flexibility
      const userToRemove = Array.from(room.users).find(
        (user) => user.userId === userId || user.socketId === socket.id
      );

      if (userToRemove) {
        // Remove user from room and notify others
        room.users.delete(userToRemove);
        socket.to(roomId).emit("user-left", { userId: userToRemove.userId });

        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
      socket.leave(roomId);
    }
  });

  /**
   * Handle real-time code updates
   * Broadcasts code changes to all participants in the room
   * @param {Object} params - Code update parameters
   * @param {string} params.roomId - Room identifier
   * @param {string} params.code - Updated code content
   * @param {string} params.language - Programming language
   */
  socket.on("code-update", ({ roomId, code, language }) => {
    socket.to(roomId).emit("code-update", { code, language });
  });

  /**
   * Handle chat messages in collaboration rooms
   * Broadcasts messages to all participants
   * @param {Object} params - Message parameters
   * @param {string} params.roomId - Room identifier
   * @param {string} params.message - Message content
   * @param {string} params.username - Sender's username
   */
  socket.on("send-message", ({ roomId, message, username }) => {
    io.to(roomId).emit("room-message", {
      message,
      username,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Handle socket disconnection
   * Cleans up user data and notifies other participants
   */
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Clean up user from all rooms they were part of
    rooms.forEach((room, roomId) => {
      const userToRemove = Array.from(room.users).find(
        (user) => user.socketId === socket.id
      );

      if (userToRemove) {
        room.users.delete(userToRemove);
        socket.to(roomId).emit("user-left", { userId: userToRemove.userId });

        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

/**
 * Start the Socket.IO server
 * Listens on the specified port or defaults to 3001
 */
const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
