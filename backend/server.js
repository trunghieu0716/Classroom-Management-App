const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { INSTRUCTOR_ID, INSTRUCTOR_ROOM, getStudentRoomId } = require("./config/chatRooms");
require("dotenv").config();

// Import routes
const authRouter = require("./router/authRouter");
const instructorRouter = require("./router/instructorRouter");
const studentRouter = require("./router/studentRouter");
const chatRouter = require("./router/chatRouter");
// New authentication routes
const instructorAuthRouter = require("./router/instructorAuthRouter");
const studentAuthRouter = require("./router/studentAuthRouter");

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// Middleware để xử lý request với content-type text/plain và application/json
app.use(express.text({ type: 'text/plain' }));
app.use(express.json());

// Middleware để xử lý text/plain như JSON
app.use((req, res, next) => {
  // Nếu body là string và content-type là text/plain, thử parse thành JSON
  if (typeof req.body === 'string' && 
      req.headers['content-type'] && 
      req.headers['content-type'].includes('text/plain')) {
    try {
      req.body = JSON.parse(req.body);
      console.log('Parsed text/plain to JSON:', req.body);
    } catch (e) {
      console.error('Failed to parse text/plain as JSON:', e);
    }
  }
  next();
});

// Routes
app.use("/api", authRouter); // Main auth routes at root level
app.use("/api/instructor", instructorRouter);
app.use("/api/student", studentRouter);
app.use("/api/chat", chatRouter);
// Phần này sẽ được loại bỏ sau khi cập nhật toàn bộ API
app.use("/api/instructor-auth", instructorAuthRouter);
app.use("/api/student-auth", studentAuthRouter);

// Add plural routes for compatibility with frontend
app.use("/api/instructors", instructorRouter);
app.use("/api/students", studentRouter);

// Test route
app.get("/", (req, res) => {
  res.send("Classroom Management Backend is running 🚀");
});

// Socket.io for real-time chat and features
const { db } = require("./config/firebaseAdmin");

// Keep track of connected users with their ID and socket ID
const connectedUsers = new Map(); // Maps userId to socket ID
const userSockets = new Map(); // Maps socket ID to userId

io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);

  // Handle user authentication when they log in
  socket.on("user-authenticated", async (userData) => {
    try {
      const { phone, userType, name } = userData;
      
      if (!phone) {
        console.error("❌ User authentication failed: No phone/ID provided");
        return;
      }

      // Store user data in socket for easy access
      socket.userData = userData;
      
      // Map user ID to socket ID for direct messaging
      connectedUsers.set(phone, socket.id);
      userSockets.set(socket.id, phone);
      
      console.log(`👤 User authenticated: ${name} (${userType}) - ${phone}`);

      // Broadcast user's online status to everyone
      socket.broadcast.emit('user-online', {
        id: phone,
        userType,
        name
      });

      // Send the user the current online users
      const onlineUsers = [];
      connectedUsers.forEach((socketId, userId) => {
        const userSocket = io.sockets.sockets.get(socketId);
        if (userSocket && userSocket.userData && userId !== phone) {
          onlineUsers.push({
            id: userId,
            userType: userSocket.userData.userType,
            name: userSocket.userData.name
          });
        }
      });
      
      socket.emit('online-users', onlineUsers);

    } catch (error) {
      console.error("❌ Error in user authentication:", error);
    }
  });

  // Handle direct messaging between users
  socket.on("send-message", async (messageData) => {
    try {
      const { recipientId, message, tempId } = messageData;
      
      // Get sender data from socket
      const sender = socket.userData;
      
      if (!sender || !message || !recipientId) {
        socket.emit('message-error', { 
          error: 'Missing required message data',
          tempId
        });
        return;
      }

      // Create unique chat room ID for these two users (alphabetically sorted)
      const participants = [sender.phone, recipientId].sort();
      const chatId = `chat_${participants[0]}_${participants[1]}`;

      console.log(`💬 Message from ${sender.name} to ${recipientId}: ${message}`);

      // Prepare message with standard format
      const newMessage = {
        senderId: sender.phone,
        senderName: sender.name,
        senderType: sender.userType,
        recipientId: recipientId,
        message: message.trim(),
        chatId: chatId,
        timestamp: new Date(),
        tempId: tempId || Date.now().toString()
      };

      try {
        // Save to Firestore for message history
        const messageRef = await db.collection("messages").add(newMessage);
        const messageId = messageRef.id;
        
        // Update chat room metadata
        await db.collection("chats").doc(chatId).set({
          lastMessage: message.trim(),
          lastMessageFrom: sender.name,
          lastMessageAt: new Date(),
          participants: [sender.phone, recipientId],
          updatedAt: new Date()
        }, { merge: true });
        
        // Prepare message for socket delivery
        const messageToSend = {
          ...newMessage,
          id: messageId,
          timestamp: newMessage.timestamp.toISOString()
        };
        
        console.log(`✅ Message saved with ID: ${messageId}`);
        
        // Find recipient's socket ID to send direct message
        const recipientSocketId = connectedUsers.get(recipientId);
        if (recipientSocketId) {
          // Send directly to recipient if online
          io.to(recipientSocketId).emit('receive-message', messageToSend);
        }
        
        // Always send confirmation back to sender
        socket.emit('message-sent', {
          tempId: tempId,
          messageId: messageId,
          timestamp: newMessage.timestamp.toISOString()
        });
        
        // Also send the message to the sender for consistency
        socket.emit('receive-message', messageToSend);
        
      } catch (error) {
        console.error("❌ Error saving message:", error);
        socket.emit('message-error', {
          error: 'Failed to save message',
          tempId: tempId
        });
      }

    } catch (error) {
      console.error("❌ Error handling message:", error);
      socket.emit('message-error', { 
        error: 'Failed to send message',
        tempId: messageData.tempId
      });
    }
  });

  // Handle chat history requests
  socket.on("get-chat-history", async (data) => {
    try {
      const { recipientId, limit = 50 } = data;
      
      if (!recipientId) {
        socket.emit('chat-history-error', { error: 'Missing recipient ID' });
        return;
      }
      
      const sender = socket.userData;
      if (!sender) {
        socket.emit('chat-history-error', { error: 'User not authenticated' });
        return;
      }
      
      // Create chat room ID the same way as send-message
      const participants = [sender.phone, recipientId].sort();
      const chatId = `chat_${participants[0]}_${participants[1]}`;
      
      // Query messages for this chat
      const messagesSnapshot = await db.collection("messages")
        .where("chatId", "==", chatId)
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();
      
      const messages = [];
      messagesSnapshot.forEach(doc => {
        const messageData = doc.data();
        messages.push({
          id: doc.id,
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          senderType: messageData.senderType,
          message: messageData.message,
          timestamp: messageData.timestamp.toDate().toISOString(),
          chatId: messageData.chatId
        });
      });
      
      // Send messages to requester
      socket.emit('chat-history', {
        chatId,
        recipientId,
        messages: messages.reverse() // Send in chronological order
      });
      
      console.log(`� Sent ${messages.length} messages from chat ${chatId}`);

    } catch (error) {
      console.error("❌ Error fetching chat history:", error);
      socket.emit('chat-history-error', { error: 'Failed to fetch chat history' });
    }
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    const userId = userSockets.get(socket.id);
    
    if (userId) {
      // Get user data for the notification
      const userData = socket.userData || {};
      
      // Notify others this user is offline
      socket.broadcast.emit('user-offline', {
        id: userId,
        userType: userData.userType,
        name: userData.name
      });
      
      // Clean up user mappings
      connectedUsers.delete(userId);
      userSockets.delete(socket.id);
      
      console.log(`👋 User disconnected: ${userData.name || userId}`);
    } else {
      console.log("👋 Unknown client disconnected:", socket.id);
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });
});

// Make io accessible to routes
app.set("io", io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`💬 Real-time chat enabled`);
});