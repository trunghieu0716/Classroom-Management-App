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

// Store connected users
const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);

  // Handle user authentication and join their rooms
  socket.on("user-authenticated", async (userData) => {
    try {
      socket.userData = userData;
      const { phone, userType, name } = userData;
      
      // Store user connection
      connectedUsers.set(socket.id, { phone, userType, name });
      
      console.log(`👤 User authenticated: ${name} (${userType}) - ${phone}`);

      // Join user-specific room
      socket.join(`user_${phone}`);

      // PHƯƠNG ÁN ĐƠN GIẢN HÓA:
      // Chỉ có 1 giáo viên và các học viên cùng chung phòng chat
      
      if (userType === 'instructor') {
        // Giáo viên tham gia phòng chat chung
        socket.join(INSTRUCTOR_ROOM);
        console.log(`🏠 Instructor joined main room: ${INSTRUCTOR_ROOM}`);
        
        // Giáo viên cũng tham gia các phòng chat của từng học viên
        const studentsSnapshot = await db.collection("students").get();
        console.log(`Found ${studentsSnapshot.size} students for instructor`);
        
        studentsSnapshot.forEach(doc => {
          const studentData = doc.data();
          // Ưu tiên dùng email cho học viên
          const studentId = studentData.email || studentData.phone;
          
          if (!studentId) {
            console.log(`⚠️ Student ${doc.id} has no ID (email/phone)`);
            return;
          }
          
          // Tham gia phòng chat riêng của học viên
          const studentRoom = getStudentRoomId(studentId);
          socket.join(studentRoom);
          console.log(`🏠 Instructor joined student room: ${studentRoom}`);
        });
        
        // Cho phép nhận tin nhắn từ các định dạng phòng cũ (để tương thích)
        socket.join(`chat_${INSTRUCTOR_ID}_*`);
        
      } else if (userType === 'student') {
        // Học viên tham gia phòng chat chung với giáo viên
        socket.join(INSTRUCTOR_ROOM);
        console.log(`🏠 Student joined main room: ${INSTRUCTOR_ROOM}`);
        
        // Học viên cũng tham gia phòng chat riêng của mình
        const studentId = phone; // phone chính là ID học viên (có thể là email)
        const studentRoom = getStudentRoomId(studentId);
        socket.join(studentRoom);
        console.log(`🏠 Student joined personal room: ${studentRoom}`);
        
        // Cho phép nhận tin nhắn từ các định dạng phòng cũ (để tương thích)
        const compatRoomId = `chat_instructor1_${studentId}`;
        socket.join(compatRoomId);
        console.log(`🏠 Student also joined compatibility room: ${compatRoomId}`);
      }

      // Notify user is online
      socket.broadcast.emit('user-online', {
        phone,
        userType,
        name
      });

    } catch (error) {
      console.error("❌ Error in user authentication:", error);
    }
  });

  // Handle joining specific chat room
  socket.on("join-chat-room", async (roomId) => {
    // PHƯƠNG ÁN ĐƠN GIẢN HÓA:
    // Đơn giản hóa việc tham gia phòng chat
    
    // Xác định loại người dùng và ID
    const userType = socket.userData?.userType;
    const userId = socket.userData?.phone || socket.userData?.email;
    
    let standardRoomId;
    
    if (userType === 'instructor') {
      // Giáo viên luôn tham gia phòng chính
      standardRoomId = INSTRUCTOR_ROOM;
      
      // Kiểm tra xem giáo viên có đang cố gắng tham gia phòng riêng của học viên nào không
      if (roomId.includes('_student_') || roomId.includes('instructor1_')) {
        // Trích xuất ID học viên từ roomId
        let studentId;
        if (roomId.includes('_student_')) {
          studentId = roomId.split('_student_')[1];
        } else if (roomId.includes('instructor1_')) {
          studentId = roomId.split('instructor1_')[1];
        }
        
        if (studentId) {
          // Tham gia phòng riêng của học viên
          const studentRoom = getStudentRoomId(studentId);
          socket.join(studentRoom);
          console.log(`💬 Instructor joining student room: ${studentRoom}`);
        }
      }
    } else if (userType === 'student') {
      // Học viên luôn tham gia phòng chính
      standardRoomId = INSTRUCTOR_ROOM;
      
      // Học viên cũng tham gia phòng riêng của mình
      const studentRoom = getStudentRoomId(userId);
      socket.join(studentRoom);
      console.log(`� Student joining personal room: ${studentRoom}`);
    }
    
    // Tham gia phòng chính
    socket.join(standardRoomId);
    console.log(`💬 User ${socket.id} joined chat room: ${standardRoomId}`);
    
    // Log all rooms this socket is in for debugging
    const rooms = Array.from(socket.rooms);
    console.log(`🔍 Socket ${socket.id} is now in rooms:`, rooms);
    
    // Notify others in the room
    socket.to(standardRoomId).emit('user-joined-chat', {
      userId: userId,
      userName: socket.userData?.name,
      userType: userType
    });
    
    // Tham gia cả phòng gốc để đảm bảo tương thích
    socket.join(roomId);
  });

  // Handle sending messages
  socket.on("send-message", async (messageData) => {
    try {
      const { roomId, from, fromName, fromType, message, messageType = 'text', to = null } = messageData;
      
      console.log(`💬 Message received: ${fromName} -> Room ${roomId} -> To: ${to || 'all'}`);

      // Validate message data
      if (!from || !fromName || !fromType || !message) {
        socket.emit('message-error', { 
          error: 'Missing required message data',
          tempId: messageData.tempId // Return the tempId for frontend error handling
        });
        return;
      }

      // PHƯƠNG ÁN CẢI TIẾN:
      // Xác định phòng chat cần gửi tin nhắn và người nhận cụ thể
      let targetRoomId;
      let recipientId = to;
      
      if (fromType === 'instructor') {
        // Nếu là giáo viên gửi, xác định người nhận từ tham số hoặc roomId
        if (roomId.includes('_student_')) {
          // Phòng cá nhân của học viên
          recipientId = to || roomId.split('_student_')[1];
          targetRoomId = getStudentRoomId(recipientId);
        } else if (to) {
          // Có chỉ định người nhận cụ thể
          targetRoomId = getStudentRoomId(to);
        } else {
          // Không xác định được người nhận, sử dụng roomId gốc
          targetRoomId = roomId;
        }
      } else {
        // Học viên gửi tin nhắn đến phòng riêng của mình và người nhận là instructor
        targetRoomId = getStudentRoomId(from);
        recipientId = INSTRUCTOR_ID; // Gửi cho giáo viên
      }

      // Create message document
      const messageDoc = {
        from,
        fromName,
        fromType,
        message: message.trim(),
        messageType,
        timestamp: new Date(),
        read: false,
        targetRoomId, // Lưu phòng đích để dễ truy vấn sau này
        to: recipientId, // Lưu thông tin người nhận cụ thể
        originalRoomId: roomId // Lưu roomId gốc từ client
      };

      // Save to Firebase
      // Lưu vào collection chung cho dễ quản lý
      const messageRef = await db.collection("chatMessages").add(messageDoc);

      // Cập nhật metadata cho phòng chat
      await db.collection("chatRooms").doc(targetRoomId).set({
        lastMessage: message.trim(),
        lastMessageFrom: fromName,
        lastMessageAt: new Date(),
        participants: [from, recipientId].filter(Boolean), // Lưu cả người gửi và người nhận
        updatedAt: new Date()
      }, { merge: true });

      const savedMessage = {
        id: messageRef.id,
        ...messageDoc
      };

      // Đảm bảo timestamp được chuyển đổi đúng cách
      const serializedMessage = {
        ...savedMessage,
        timestamp: savedMessage.timestamp.toISOString(),
        roomId: targetRoomId // Đảm bảo client nhận được roomId đúng
      };
      
      // Debug log: kiểm tra số client trong phòng chat
      const roomSockets = await io.in(targetRoomId).fetchSockets();
      console.log(`📢 Broadcasting to ${roomSockets.length} clients in room ${targetRoomId}`);
      roomSockets.forEach(s => console.log(` - Socket ${s.id} in room`));
      
      // Trường hợp 1: Gửi tin nhắn trực tiếp đến socket của người gửi và người nhận
      if (recipientId) {
        // Gửi cho người nhận cụ thể (nếu có)
        if (fromType === 'instructor') {
          // Gửi tin nhắn đến phòng của học viên
          const studentRoom = getStudentRoomId(recipientId);
          io.to(studentRoom).emit('receive-message', {
            ...serializedMessage,
            specificRecipient: recipientId
          });
          console.log(`📢 Sending to specific student room: ${studentRoom}`);
        } else {
          // Nếu người gửi là học viên, gửi đến phòng của giáo viên
          io.to(`user_${INSTRUCTOR_ID}`).emit('receive-message', {
            ...serializedMessage,
            specificRecipient: INSTRUCTOR_ID
          });
          console.log(`📢 Sending to instructor's personal room: user_${INSTRUCTOR_ID}`);
        }
      }
      
      // Trường hợp 2: Gửi tin nhắn đến phòng gốc để đảm bảo người gửi luôn nhận được
      io.to(roomId).emit('receive-message', serializedMessage);
      
      // Trường hợp 3: Gửi tin nhắn đến phòng đích (nếu khác với phòng gốc)
      if (roomId !== targetRoomId) {
        io.to(targetRoomId).emit('receive-message', serializedMessage);
        console.log(`📢 Also broadcasting to target room: ${targetRoomId}`);
      }
      
      // Tương thích ngược - gửi đến phòng định dạng cũ
      if (fromType === 'instructor' && recipientId) {
        const legacyRoomId = `chat_instructor1_${recipientId}`;
        io.to(legacyRoomId).emit('receive-message', serializedMessage);
        console.log(`📢 Also broadcasting to legacy room: ${legacyRoomId}`);
      }
      
      // Send delivery confirmation to sender
      socket.emit('message-sent', {
        tempId: messageData.tempId, // For frontend message tracking
        messageId: messageRef.id,
        roomId: targetRoomId, // Add roomId for consistent tracking
        timestamp: messageDoc.timestamp.toISOString()
      });

      console.log(`✅ Message saved and broadcasted: ${messageRef.id} in room ${targetRoomId}`);

    } catch (error) {
      console.error("❌ Error handling message:", error);
      socket.emit('message-error', { 
        error: 'Failed to send message',
        tempId: messageData.tempId, // Return the tempId for frontend error handling
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  });

  // Handle typing indicators
  socket.on("typing-start", (data) => {
    const { roomId, userName, userType } = data;
    socket.to(roomId).emit('user-typing', {
      userName,
      userType,
      isTyping: true
    });
  });

  socket.on("typing-stop", (data) => {
    const { roomId, userName, userType } = data;
    socket.to(roomId).emit('user-typing', {
      userName,
      userType,
      isTyping: false
    });
  });

  // Handle message read status
  socket.on("mark-messages-read", async (data) => {
    try {
      const { roomId, userId } = data;
      
      // Update read status in database
      const unreadSnapshot = await db.collection("chatRooms")
        .doc(roomId)
        .collection("messages")
        .where("read", "==", false)
        .where("from", "!=", userId)
        .get();

      if (!unreadSnapshot.empty) {
        const batch = db.batch();
        unreadSnapshot.forEach(doc => {
          batch.update(doc.ref, { read: true });
        });
        await batch.commit();

        // Notify room about read status
        socket.to(roomId).emit('messages-read', {
          readBy: userId,
          count: unreadSnapshot.size
        });

        console.log(`👁️ Marked ${unreadSnapshot.size} messages as read in ${roomId}`);
      }

    } catch (error) {
      console.error("❌ Error marking messages as read:", error);
    }
  });

  // Handle instructor events
  socket.on("student-added", (studentData) => {
    io.emit("student-list-updated", studentData);
    console.log(`📚 Student added broadcast: ${studentData.name}`);
  });

  socket.on("lesson-assigned", (lessonData) => {
    const { studentPhone } = lessonData;
    io.to(`user_${studentPhone}`).emit("new-lesson", lessonData);
    console.log(`📖 Lesson assigned to: ${studentPhone}`);
  });

  // Handle student events
  socket.on("lesson-completed", (lessonData) => {
    io.emit("lesson-completed", lessonData);
    console.log(`✅ Lesson completed: ${lessonData.title}`);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const userData = connectedUsers.get(socket.id);
    if (userData) {
      // Notify others user is offline
      socket.broadcast.emit('user-offline', {
        phone: userData.phone,
        userType: userData.userType,
        name: userData.name
      });
      
      connectedUsers.delete(socket.id);
      console.log(`👋 User disconnected: ${userData.name} (${userData.userType})`);
    } else {
      console.log("👋 Client disconnected:", socket.id);
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