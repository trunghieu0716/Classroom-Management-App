const { db } = require("../config/firebaseAdmin");
const { formatPhoneNumber } = require("../config/twilio");

/**
 * GET /messages/:roomId
 * Get chat history for a specific room
 */
const getChatHistory = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { limit = 50 } = req.query;

        console.log(`💬 Fetching chat history for room: ${roomId}`);

        // PHƯƠNG ÁN CẢI TIẾN:
        let messagesSnapshot;
        
        // Lấy tham chiếu đến các cấu hình phòng chat
        const { INSTRUCTOR_ROOM, getStudentRoomId } = require("../config/chatRooms");

        // Trích xuất thông tin người dùng từ roomId để lọc tin nhắn
        let user1, user2;
        
        // Lấy thông tin người dùng từ query params (nếu có)
        const { currentUser, chatUser } = req.query;
        
        if (roomId.includes('_')) {
            const parts = roomId.split('_');
            if (parts.length >= 3) {
                // Định dạng chat_{user1}_{user2}
                user1 = parts[1];
                user2 = parts[2];
            }
        }
        
        // Sử dụng thông tin người dùng từ query params nếu có
        const userA = currentUser || user1;
        const userB = chatUser || user2;
        
        console.log(`📊 Filtering messages for users: ${userA} and ${userB}`);
        
        // Lấy tin nhắn giữa hai người dùng cụ thể bằng lọc tại client nhiệm vụ
        if (userA && userB) {
            console.log(`🔍 Getting messages between users ${userA} and ${userB}`);
            
            try {
                // Sử dụng room ID được tạo từ ID hai người dùng (đã sắp xếp theo bảng chữ cái)
                const participants = [userA, userB].sort();
                const roomId = `chat_${participants[0]}_${participants[1]}`;
                console.log(`🔍 Using normalized room ID: ${roomId}`);
                
                // Thử lấy tin nhắn theo roomId
                const roomMessages = await db.collection("chatMessages")
                    .where("roomId", "==", roomId)
                    .orderBy("timestamp", "desc")
                    .limit(parseInt(limit))
                    .get();
                    
                if (!roomMessages.empty) {
                    console.log(`📊 Found ${roomMessages.size} messages using roomId ${roomId}`);
                    messagesSnapshot = roomMessages;
                } else {
                    // Fallback: lọc theo người gửi và người nhận
                    const recentSnapshot = await db.collection("chatMessages")
                        .orderBy("timestamp", "desc")
                        .limit(parseInt(limit) * 5)
                        .get();
                        
                    const filtered = [];
                    recentSnapshot.forEach(doc => {
                        const d = doc.data();
                        if ((d.from === userA && d.to === userB) || (d.from === userB && d.to === userA)) {
                            filtered.push(doc);
                        }
                    });
                    // Limit to requested count
                    const limited = filtered.slice(0, parseInt(limit));
                    messagesSnapshot = {
                        empty: limited.length === 0,
                        size: limited.length,
                        forEach: callback => limited.forEach(callback)
                    };
                    console.log(`📊 In-memory filtered ${messagesSnapshot.size} messages between users ${userA} and ${userB}`);
                }
            } catch (error) {
                console.error(`❌ Error getting chat messages: ${error.message}`);
                // Fallback to old method if error occurs
                const recentSnapshot = await db.collection("chatMessages")
                    .orderBy("timestamp", "desc")
                    .limit(parseInt(limit) * 5)
                    .get();
                    
                const filtered = [];
                recentSnapshot.forEach(doc => {
                    const d = doc.data();
                    if ((d.from === userA && d.to === userB) || (d.from === userB && d.to === userA)) {
                        filtered.push(doc);
                    }
                });
                // Limit to requested count
                const limited = filtered.slice(0, parseInt(limit));
                messagesSnapshot = {
                    empty: limited.length === 0,
                    size: limited.length,
                    forEach: callback => limited.forEach(callback)
                };
                console.log(`📊 Fallback: In-memory filtered ${messagesSnapshot.size} messages between users ${userA} and ${userB}`);
            }
        }
        
        // Nếu không tìm thấy tin nhắn hoặc không có thông tin người dùng,
        // thử các chiến lược khác
        if (!messagesSnapshot || messagesSnapshot.empty) {
            // Kiểm tra loại phòng chat và lấy tin nhắn phù hợp
            if (roomId.includes('instructor1_')) {
                // Định dạng phòng cũ (chat_instructor1_studentId)
                const studentId = roomId.split('instructor1_')[1];
                const studentRoom = getStudentRoomId(studentId);
                
                // Lấy tin nhắn từ cấu trúc mới
                messagesSnapshot = await db.collection("chatMessages")
                    .where("targetRoomId", "in", [INSTRUCTOR_ROOM, studentRoom])
                    .orderBy("timestamp", "desc")
                    .limit(parseInt(limit))
                    .get();
                    
            } else if (roomId.includes('_student_')) {
                // Phòng riêng của học viên
                const studentId = roomId.split('_student_')[1];
                
                // Lấy tin nhắn gửi đến hoặc từ học viên này
                messagesSnapshot = await db.collection("chatMessages")
                    .where("to", "==", studentId)
                    .orderBy("timestamp", "desc")
                    .limit(parseInt(limit))
                    .get();
                    
            } else if (roomId === INSTRUCTOR_ROOM) {
                // Phòng chung của giáo viên
                messagesSnapshot = await db.collection("chatMessages")
                    .where("targetRoomId", "==", INSTRUCTOR_ROOM)
                    .orderBy("timestamp", "desc")
                    .limit(parseInt(limit))
                    .get();
                    
            } else {
                // Định dạng phòng khác (có thể là cấu trúc cũ)
                try {
                    // Thử lấy từ cấu trúc cũ trước
                    messagesSnapshot = await db.collection("chatRooms")
                        .doc(roomId)
                        .collection("messages")
                        .orderBy("timestamp", "desc")
                        .limit(parseInt(limit))
                        .get();
                        
                    // Nếu không có tin nhắn trong cấu trúc cũ, thử lấy từ cấu trúc mới
                    if (messagesSnapshot.empty) {
                        messagesSnapshot = await db.collection("chatMessages")
                            .where("roomId", "==", roomId)
                            .orderBy("timestamp", "desc")
                            .limit(parseInt(limit))
                            .get();
                    }
                } catch (error) {
                    // Nếu có lỗi, thử lấy từ cấu trúc mới
                    messagesSnapshot = await db.collection("chatMessages")
                        .orderBy("timestamp", "desc")
                        .limit(parseInt(limit))
                        .get();
                }
            }
        }

        const messages = [];
        messagesSnapshot.forEach(doc => {
            const messageData = doc.data();
            
            // Chuyển đổi timestamp sang dạng ISO string nếu là timestamp
            let timestamp;
            if (messageData.timestamp instanceof Date) {
                timestamp = messageData.timestamp.toISOString();
            } else if (messageData.timestamp && messageData.timestamp.seconds) {
                // Firestore timestamp
                timestamp = new Date(messageData.timestamp.seconds * 1000).toISOString();
            } else {
                timestamp = new Date().toISOString(); // Fallback
            }
            
            // Đảm bảo các thông tin cần thiết cho chat
            messages.push({
                id: doc.id,
                from: messageData.from,
                fromName: messageData.fromName || "Unknown",
                fromType: messageData.fromType || "unknown",
                message: messageData.message,
                timestamp: timestamp,
                read: messageData.read || false,
                messageType: messageData.messageType || 'text',
                to: messageData.to || null, // Thêm thông tin người nhận
                toName: messageData.toName || "Unknown", // Thêm tên người nhận
                toType: messageData.toType || "unknown", // Thêm loại người nhận
                roomId: messageData.roomId || roomId // Đảm bảo có thông tin roomId
            });
        });

        // Reverse to get chronological order (oldest first)
        messages.reverse();

        console.log(`✅ Found ${messages.length} messages in room ${roomId}`);

        res.json({
            success: true,
            roomId: roomId,
            messages: messages,
            totalCount: messages.length
        });

    } catch (error) {
        console.error("❌ Error fetching chat history:", error);
        res.status(500).json({ 
            error: "Failed to fetch chat history",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

/**
 * POST /sendMessage
 * Send a message (also handled via Socket.io)
 */
const sendMessage = async (req, res) => {
    try {
        const { roomId, from, fromName, fromType, message, messageType = 'text', to = null } = req.body;

        // Validate input
        if (!roomId || !from || !fromName || !fromType || !message) {
            return res.status(400).json({ 
                error: "roomId, from, fromName, fromType, and message are required" 
            });
        }

        console.log(`💬 Sending message in room ${roomId} from ${fromName} to ${to || 'all'}`);

        // Create message data with recipient information
        const messageData = {
            from,
            fromName,
            fromType, // 'student' or 'instructor'
            message: message.trim(),
            messageType,
            timestamp: new Date(),
            read: false,
            to // Thêm thông tin người nhận cụ thể
        };

        // Tạo room ID chuẩn cho kênh chat giữa hai người dùng
        let standardizedRoomId = roomId;
        if (from && to) {
            const participants = [from, to].sort();
            standardizedRoomId = `chat_${participants[0]}_${participants[1]}`;
            console.log(`📝 Using standardized room ID: ${standardizedRoomId}`);
        }
        
        // Thêm roomId vào tin nhắn
        messageData.roomId = standardizedRoomId;
        
        // Lưu vào cả kho lưu trữ mới (collection dành riêng cho tin nhắn)
        const chatMessageRef = await db.collection("chatMessages").add(messageData);
        console.log(`✅ Message saved to chatMessages with ID: ${chatMessageRef.id}`);
        
        // Vẫn lưu vào cấu trúc cũ để đảm bảo tương thích
        const messageRef = await db.collection("chatRooms")
            .doc(standardizedRoomId)
            .collection("messages")
            .add(messageData);

        // Update room metadata
        await db.collection("chatRooms").doc(standardizedRoomId).set({
            lastMessage: message.trim(),
            lastMessageFrom: fromName,
            participants: [from, to].filter(Boolean), // Lưu cả người gửi và người nhận
            lastMessageAt: new Date(),
            updatedAt: new Date()
        }, { merge: true });

        const savedMessage = {
            id: messageRef.id,
            ...messageData
        };

        // Emit via Socket.io if available
        const io = req.app.get('io');
        if (io) {
            io.to(roomId).emit('receive-message', savedMessage);
            console.log(`📡 Message broadcasted to room ${roomId}`);
        }

        res.json({
            success: true,
            message: savedMessage
        });

    } catch (error) {
        console.error("❌ Error sending message:", error);
        res.status(500).json({ 
            error: "Failed to send message",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

/**
 * PUT /markAsRead/:roomId
 * Mark messages as read for a user - SIMPLIFIED VERSION
 */
const markMessagesAsRead = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        console.log(`👁️ Marking messages as read in room ${roomId} for user ${userId}`);

        // Get all unread messages (simplified query)
        const unreadSnapshot = await db.collection("chatRooms")
            .doc(roomId)
            .collection("messages")
            .where("read", "==", false)
            .get();

        if (unreadSnapshot.empty) {
            return res.json({
                success: true,
                message: "No unread messages found",
                updatedCount: 0
            });
        }

        // Filter out messages from the same user and update others
        const batch = db.batch();
        let updateCount = 0;

        unreadSnapshot.forEach(doc => {
            const messageData = doc.data();
            if (messageData.from !== userId) {
                batch.update(doc.ref, { read: true });
                updateCount++;
            }
        });

        if (updateCount > 0) {
            await batch.commit();
        }

        console.log(`✅ Marked ${updateCount} messages as read`);

        res.json({
            success: true,
            message: "Messages marked as read",
            updatedCount: updateCount
        });

    } catch (error) {
        console.error("❌ Error marking messages as read:", error);
        res.status(500).json({ 
            error: "Failed to mark messages as read",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

/**
 * GET /chatRooms/:userId
 * Get all chat rooms for a user - SIMPLIFIED VERSION
 */
const getUserChatRooms = async (req, res) => {
    try {
        const { userId } = req.params;
        const { userType } = req.query; // 'student' or 'instructor'

        console.log(`🏠 Fetching chat rooms for ${userType}: ${userId}`);

        let chatRooms = [];

        if (userType === 'instructor') {
            // For instructors, get rooms with all students
            const studentsSnapshot = await db.collection("students").get();
            
            for (const studentDoc of studentsSnapshot.docs) {
                const studentData = studentDoc.data();
                const roomId = `chat_${userId}_${studentData.phone}`;
                
                // Get room metadata
                const roomDoc = await db.collection("chatRooms").doc(roomId).get();
                const roomData = roomDoc.exists ? roomDoc.data() : {};

                // Get unread count (simplified)
                const unreadSnapshot = await db.collection("chatRooms")
                    .doc(roomId)
                    .collection("messages")
                    .where("read", "==", false)
                    .get();

                // Filter unread messages not from instructor
                let unreadCount = 0;
                unreadSnapshot.forEach(doc => {
                    const messageData = doc.data();
                    if (messageData.from !== userId) {
                        unreadCount++;
                    }
                });

                chatRooms.push({
                    roomId,
                    studentPhone: studentData.phone,
                    studentName: studentData.name,
                    studentEmail: studentData.email,
                    lastMessage: roomData.lastMessage || null,
                    lastMessageFrom: roomData.lastMessageFrom || null,
                    lastMessageAt: roomData.lastMessageAt || null,
                    unreadCount: unreadCount
                });
            }
        } else {
            // For students, get instructors
            const instructorsSnapshot = await db.collection("users")
                .where("userType", "==", "instructor")
                .get();

            for (const instructorDoc of instructorsSnapshot.docs) {
                const instructorData = instructorDoc.data();
                const roomId = `chat_${instructorData.phoneNumber}_${userId}`;
                
                // Get room metadata
                const roomDoc = await db.collection("chatRooms").doc(roomId).get();
                const roomData = roomDoc.exists ? roomDoc.data() : {};

                // Get unread count (simplified)
                const unreadSnapshot = await db.collection("chatRooms")
                    .doc(roomId)
                    .collection("messages")
                    .where("read", "==", false)
                    .get();

                // Filter unread messages not from student
                let unreadCount = 0;
                unreadSnapshot.forEach(doc => {
                    const messageData = doc.data();
                    if (messageData.from !== userId) {
                        unreadCount++;
                    }
                });

                chatRooms.push({
                    roomId,
                    instructorPhone: instructorData.phoneNumber,
                    instructorName: instructorData.name || 'Instructor',
                    lastMessage: roomData.lastMessage || null,
                    lastMessageFrom: roomData.lastMessageFrom || null,
                    lastMessageAt: roomData.lastMessageAt || null,
                    unreadCount: unreadCount
                });
            }
        }

        // Sort by last message time
        chatRooms.sort((a, b) => {
            if (!a.lastMessageAt && !b.lastMessageAt) return 0;
            if (!a.lastMessageAt) return 1;
            if (!b.lastMessageAt) return -1;
            return b.lastMessageAt.toDate() - a.lastMessageAt.toDate();
        });

        console.log(`✅ Found ${chatRooms.length} chat rooms`);

        res.json({
            success: true,
            userId,
            userType,
            chatRooms
        });

    } catch (error) {
        console.error("❌ Error fetching chat rooms:", error);
        res.status(500).json({ 
            error: "Failed to fetch chat rooms",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

/**
 * GET /createTestData
 * Create test data for chat testing
 */
const createTestData = async (req, res) => {
    try {
        console.log("🔧 Creating test data for chat...");

        // Create test instructor user
        const instructorPhone = "+84764950492";
        await db.collection("users").doc(instructorPhone).set({
            phoneNumber: instructorPhone,
            userType: "instructor",
            name: "Test Instructor",
            isActive: true,
            createdAt: new Date()
        }, { merge: true });

        // Create test student
        const studentPhone = "+84987654321";
        await db.collection("students").doc(studentPhone).set({
            name: "Nguyen Van A",
            phone: studentPhone,
            email: "nguyenvana@example.com",
            createdAt: new Date(),
            isActive: true,
            totalLessons: 2,
            completedLessons: 1
        }, { merge: true });

        await db.collection("users").doc(studentPhone).set({
            phoneNumber: studentPhone,
            userType: "student",
            name: "Nguyen Van A",
            email: "nguyenvana@example.com",
            isActive: true,
            createdAt: new Date()
        }, { merge: true });

        // Create test chat room with some messages
        const roomId = `chat_${instructorPhone}_${studentPhone}`;
        
        await db.collection("chatRooms").doc(roomId).set({
            lastMessage: "Hello! How are your lessons going?",
            lastMessageFrom: "Test Instructor",
            lastMessageAt: new Date(),
            updatedAt: new Date()
        });

        // Add some test messages
        const messages = [
            {
                from: instructorPhone,
                fromName: "Test Instructor",
                fromType: "instructor",
                message: "Hello! How are your lessons going?",
                messageType: "text",
                timestamp: new Date(Date.now() - 300000), // 5 minutes ago
                read: false
            },
            {
                from: studentPhone,
                fromName: "Nguyen Van A",
                fromType: "student",
                message: "Hi! I'm doing well with the JavaScript lessons. Thank you!",
                messageType: "text",
                timestamp: new Date(Date.now() - 240000), // 4 minutes ago
                read: true
            },
            {
                from: instructorPhone,
                fromName: "Test Instructor",
                fromType: "instructor",
                message: "Great! Do you have any questions about the current assignment?",
                messageType: "text",
                timestamp: new Date(Date.now() - 120000), // 2 minutes ago
                read: false
            }
        ];

        for (const messageData of messages) {
            await db.collection("chatRooms")
                .doc(roomId)
                .collection("messages")
                .add(messageData);
        }

        console.log("✅ Test data created successfully");

        res.json({
            success: true,
            message: "Test data created successfully",
            data: {
                instructorPhone,
                studentPhone,
                roomId,
                messagesCreated: messages.length
            }
        });

    } catch (error) {
        console.error("❌ Error creating test data:", error);
        res.status(500).json({ 
            error: "Failed to create test data",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

module.exports = {
    getChatHistory,
    sendMessage,
    markMessagesAsRead,
    getUserChatRooms,
    createTestData
};