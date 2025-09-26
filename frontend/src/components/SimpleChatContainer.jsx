import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import { io } from 'socket.io-client';

const SimpleChatContainer = ({ userType }) => {
  const { user, token } = useAuth();
  // Ensure we have the user type from props or from the user object
  const actualUserType = userType || user?.userType;
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [chatUsers, setChatUsers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const messageListRef = useRef(null);
  
  // Connect to socket when component mounts
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log('Connecting to socket.io server:', apiUrl);
    
    // Thử lại kết nối socket.io với cấu hình chi tiết hơn
    const socketConnection = io(apiUrl, {
      transports: ['polling', 'websocket'], // Thử polling trước, sau đó nâng cấp lên websocket
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
    });
    
    setSocket(socketConnection);
    
    // Set up socket event listeners
    socketConnection.on('connect', () => {
      console.log('Socket connected:', socketConnection.id);
      setSocketStatus('connected');
      
      // Authenticate user
      if (user) {
        const userId = user.id || user.email || user.phone;
        if (!userId) {
          console.error('Cannot authenticate socket: User ID not available');
        } else {
          console.log('Authenticating socket with user:', { 
            id: userId, 
            type: actualUserType,
            name: user.name 
          });
          
          socketConnection.emit('user-authenticated', {
            phone: userId,
            userType: actualUserType,
            name: user.name || 'Unknown User'
          });
        }
      } else {
        console.error('Cannot authenticate socket: User not logged in');
      }
      
      setLoading(false);
    });
    
    socketConnection.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setSocketStatus('error');
      setLoading(false);
    });
    
    socketConnection.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setSocketStatus('disconnected');
    });
    
    // Clean up on unmount
    return () => {
      if (socketConnection) {
        socketConnection.disconnect();
      }
    };
  }, [user, actualUserType]);
  
  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;
    
    // Handle incoming messages
    socket.on('receive-message', (messageData) => {
      console.log('Received message:', messageData);
      
      // Always log received message for debugging
      console.log('Current user:', user);
      console.log('Current selected chat:', selectedChat);
      
      // Only add message if we're in the correct chat room
      if (selectedChat) {
        // Chuẩn hóa ID theo cùng cách như khi gửi tin nhắn
        let currentUserId;
        if (actualUserType === 'instructor') {
          const rawId = user?.phone || user?.phoneNumber || user?.id;
          currentUserId = rawId?.startsWith('0') ? `+84${rawId.slice(1)}` : rawId;
        } else {
          currentUserId = user?.email || user?.id;
        }
        
        let chatUserId;
        if (selectedChat.userType === 'instructor') {
          const rawChatId = selectedChat?.phone || selectedChat?.id;
          chatUserId = rawChatId?.startsWith('0') ? `+84${rawChatId.slice(1)}` : rawChatId;
        } else {
          chatUserId = selectedChat?.email || selectedChat?.id;
        }
        
        // Kiểm tra xem tin nhắn có phải dành cho cuộc trò chuyện hiện tại không
        let isMessageForCurrentChat = false;
        
        // Log chi tiết để debug
        console.log('Message filtering details:', {
          messageFrom: messageData.from,
          messageTo: messageData.to,
          currentUserId: currentUserId,
          chatUserId: chatUserId,
          fromName: messageData.fromName
        });
        
        // Kiểm tra nới lỏng hơn: chỉ cần tin nhắn liên quan đến người dùng hiện tại và người chat đã chọn
        isMessageForCurrentChat = (
          // Người dùng hiện tại là người gửi hoặc người nhận
          ((messageData.from === currentUserId || messageData.to === currentUserId)) &&
          // Người chat đã chọn là người gửi hoặc người nhận
          ((messageData.from === chatUserId || messageData.to === chatUserId))
        );
        
        // Ghi log chi tiết để debug
        console.log('Message filtering details (UPDATED):', {
          messageFrom: messageData.from,
          messageTo: messageData.to,
          currentUserId: currentUserId,
          chatUserId: chatUserId,
          fromName: messageData.fromName,
          fromType: messageData.fromType,
          toName: messageData.toName, 
          toType: messageData.toType,
          isForCurrentChat: isMessageForCurrentChat
        });
        
        if (isMessageForCurrentChat) {
          console.log('Message is for the current chat - will display');
          
          // Get current user ID for ownership check
          const currentUserId = user?.id || user?.email || user?.phone;
          
          // Add the message to the chat
          setMessages(prev => {
            // Check if this message is already in the list (by id or tempId)
            const isDuplicate = prev.some(msg => 
              msg.id === messageData.id || 
              (messageData.tempId && msg.id === messageData.tempId)
            );
            
            if (isDuplicate) {
              console.log('Duplicate message skipped:', messageData.id);
              return prev;
            }
            
            console.log('Adding message to chat:', messageData);
            // Ensure timestamp is valid by explicitly handling it
            let timestamp;
            try {
              // Kiểm tra định dạng timestamp chuẩn ISO
              if (typeof messageData.timestamp === 'string' && messageData.timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                timestamp = new Date(messageData.timestamp);
              } 
              // Kiểm tra xem có phải timestamp là số (milliseconds) không
              else if (!isNaN(Number(messageData.timestamp))) {
                timestamp = new Date(Number(messageData.timestamp));
              }
              // Trường hợp khác, thử chuyển đổi trực tiếp
              else {
                timestamp = new Date(messageData.timestamp);
              }
              
              // Kiểm tra lại tính hợp lệ của timestamp
              if (isNaN(timestamp.getTime())) {
                console.warn('Invalid timestamp in message, using current time:', messageData.timestamp);
                timestamp = new Date();
              }
            } catch (error) {
              console.error('Error parsing timestamp:', error, messageData.timestamp);
              timestamp = new Date();
            }
            
            // Add the new message
            return [...prev, {
              id: messageData.id,
              sender: messageData.fromName,
              senderType: messageData.fromType,
              content: messageData.message,
              timestamp: timestamp,
              isOwn: messageData.from === currentUserId
            }];
          });
        } else {
          console.warn('Message is not for the current chat - skipping');
        }
      } else {
        console.warn('No selected chat, cannot display message');
      }
    });
    
    // Handle user online status updates
    socket.on('user-online', (userData) => {
      console.log('User online:', userData);
      setChatUsers(prev => prev.map(chatUser => {
        if (chatUser.id === userData.phone) {
          return { ...chatUser, online: true };
        }
        return chatUser;
      }));
    });
    
    // Handle user offline status updates
    socket.on('user-offline', (userData) => {
      setChatUsers(prev => prev.map(chatUser => {
        if (chatUser.id === userData.phone) {
          return { ...chatUser, online: false };
        }
        return chatUser;
      }));
    });
    
    // Socket related event handlers
    socket.on('message-sent', (confirmationData) => {
      console.log('Message sent confirmation:', confirmationData);
      
      // Update the pending message with the confirmed ID and timestamp
      setMessages(prev => prev.map(msg => {
        if (msg.id === confirmationData.tempId) {
          return {
            ...msg,
            id: confirmationData.messageId,
            timestamp: new Date(confirmationData.timestamp),
            pending: false
          };
        }
        return msg;
      }));
    });
    
    socket.on('message-error', (errorData) => {
      console.error('Message error:', errorData);
      // Mark failed message in UI
      if (errorData.tempId) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === errorData.tempId) {
            return {
              ...msg,
              error: true,
              errorMessage: errorData.error || 'Failed to send'
            };
          }
          return msg;
        }));
      }
    });
    
    // Debug events
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });
    
    return () => {
      socket.off('receive-message');
      socket.off('user-online');
      socket.off('user-offline');
      socket.off('message-sent');
      socket.off('message-error');
      socket.off('disconnect');
      socket.off('reconnect');
      
      // Ghi log để debug
      console.log('🧹 Cleaned up socket event listeners');
    };
  }, [socket, user, actualUserType, selectedChat]);
    
  // Fetch real users from Firebase
  useEffect(() => {
    const fetchChatUsers = async () => {
      try {
        if (actualUserType === 'student') {
          // Students can only chat with instructors
          // For public endpoints, we don't need to send token
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/instructor`);
          let data;
          try {
            const text = await response.text();
            data = JSON.parse(text);
            console.log('Instructors data:', data);
          } catch (parseError) {
            console.error('Error parsing instructor response:', parseError);
            throw new Error('Invalid response format from server');
          }
          
          if (data.success && data.instructors) {
            const instructors = data.instructors.map(instructor => ({
              id: instructor.phone || instructor.id,
              name: instructor.name,
              userType: 'instructor',
              online: true // We can update this with actual online status later
            }));
            setChatUsers(instructors);
          } else {
            // Fallback to demo data if API call fails
            setChatUsers([{
              id: 'instructor1',
              name: 'Instructor Smith',
              userType: 'instructor',
              online: true
            }]);
          }
        } else {
          // Instructors can chat with students
          // For public endpoints, we don't need to send token
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/student`);
          let data;
          try {
            const text = await response.text();
            data = JSON.parse(text);
            console.log('Students data:', data);
          } catch (parseError) {
            console.error('Error parsing student response:', parseError);
            throw new Error('Invalid response format from server');
          }
          
          if (data.success && data.students) {
            const students = data.students.map(student => ({
              id: student.phone || student.id,
              name: student.name,
              userType: 'student',
              online: false // Default to offline, will be updated by socket events
            }));
            setChatUsers(students);
          } else {
            // Fallback to demo data if API call fails
            setChatUsers([
              {
                id: 'student1',
                name: 'John Doe',
                userType: 'student',
                online: true
              },
              {
                id: 'student2',
                name: 'Jane Smith',
                userType: 'student',
                online: false
              }
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching chat users:', error);
        // Set fallback data
        if (actualUserType === 'student') {
          setChatUsers([{
            id: 'instructor1',
            name: 'Instructor Smith',
            userType: 'instructor',
            online: true
          }]);
        } else {
          setChatUsers([
            {
              id: 'student1',
              name: 'John Doe',
              userType: 'student',
              online: true
            },
            {
              id: 'student2',
              name: 'Jane Smith',
              userType: 'student',
              online: false
            }
          ]);
        }
      }
    };
    
    fetchChatUsers();
  }, [actualUserType]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messageListRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle selecting a chat
  const handleSelectChat = async (chatUser) => {
    setSelectedChat(chatUser);
    setLoading(true);
    
    console.log('Selected chat user:', chatUser);
    console.log('Current user:', user);
    
    // Chuẩn hóa ID người dùng hiện tại
    let currentUserId;
    if (actualUserType === 'instructor') {
      // Instructor luôn dùng phone làm ID
      currentUserId = user?.phone || user?.phoneNumber || user?.id;
      const rawId = user?.phone || user?.phoneNumber || user?.id;
      currentUserId = rawId?.startsWith('0') ? `+84${rawId.slice(1)}` : rawId;
    } else {
      // Student luôn dùng email làm ID
      currentUserId = user?.email || user?.id;
    }
    
    // Chuẩn hóa ID người chat
    let chatUserId;
    if (chatUser.userType === 'instructor') {
      // Instructor luôn dùng phone làm ID
      chatUserId = chatUser?.phone || chatUser?.id;
      const rawChatId = chatUser?.phone || chatUser?.id;
      chatUserId = rawChatId?.startsWith('0') ? `+84${rawChatId.slice(1)}` : rawChatId;
    } else {
      // Student luôn dùng email làm ID
      chatUserId = chatUser?.email || chatUser?.id;
    }
    
    if (!currentUserId || !chatUserId) {
      console.error('Missing user IDs for chat:', { currentUserId, chatUserId });
      setLoading(false);
      return;
    }
    
    console.log('Normalized IDs:', { currentUserId, chatUserId });
    
    // Create a room ID based on the two users (alphabetically sorted to ensure consistency)
    const participants = [chatUserId, currentUserId].sort();
    const roomId = `chat_${participants[0]}_${participants[1]}`;
    console.log('Generated room ID:', roomId);
    
  // Tham gia vào phòng chat với ID được chuẩn hóa
  if (socket) {
    // Tạo ID phòng chuẩn hóa
    const participants = [chatUserId, currentUserId].sort();
    const standardRoomId = `chat_${participants[0]}_${participants[1]}`;
    
    console.log('Joining standardized chat room:', standardRoomId);
    socket.emit('join-chat-room', standardRoomId);
    
    // Vẫn giữ phòng gốc để tương thích
    if (roomId !== standardRoomId) {
      console.log('Also joining original room for compatibility:', roomId);
      socket.emit('join-chat-room', roomId);
    }
    
    // Đảm bảo đã tham gia vào phòng cá nhân của người dùng hiện tại
    const userPersonalRoom = `user_${currentUserId}`;
    console.log('Joining personal user room:', userPersonalRoom);
    socket.emit('join-chat-room', userPersonalRoom);
  } else {
    console.error('Socket not connected, cannot join room');
  }    try {
      // Fetch chat history from the API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      // Chat history may still need authentication
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Thêm thông tin người dùng hiện tại và người đang chat để lọc tin nhắn đúng
      const chatHistoryUrl = `${apiUrl}/api/chat/messages/${roomId}?currentUser=${encodeURIComponent(currentUserId)}&chatUser=${encodeURIComponent(chatUserId)}`;
      console.log(`Fetching chat history from: ${chatHistoryUrl}`);
      const response = await fetch(chatHistoryUrl, { headers });
      const data = await response.json();
      
      if (data.success && data.messages && data.messages.length > 0) {
        // Format messages for display và lọc để chỉ hiển thị tin nhắn giữa hai người dùng hiện tại
        const formattedMessages = data.messages
          .filter(msg => {
            // Chỉ giữ tin nhắn giữa người dùng hiện tại và người chat được chọn
            return (
              (msg.from === currentUserId && msg.to === chatUserId) || 
              (msg.from === chatUserId && msg.to === currentUserId)
            );
          })
          .map(msg => ({
            id: msg.id,
            sender: msg.fromName,
            senderType: msg.fromType,
            content: msg.message,
            timestamp: new Date(msg.timestamp),
            isOwn: msg.from === (user.id || user.email || user.phone),
            from: msg.from,
            to: msg.to
          }));
          
        console.log(`Filtered ${data.messages.length} messages to ${formattedMessages.length} relevant messages`);
        setMessages(formattedMessages);
      } else {
        // No messages yet, show welcome message
        setMessages([{
          id: Date.now(),
          sender: 'System',
          content: `Start chatting with ${chatUser.name}`,
          timestamp: new Date(),
          isSystem: true
        }]);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setMessages([{
        id: Date.now(),
        sender: 'System',
        content: `Start chatting with ${chatUser.name}`,
        timestamp: new Date(),
        isSystem: true
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle sending messages
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!message.trim() || !socket || !selectedChat) return;
    
    // Chuẩn hóa ID người dùng hiện tại (giống như trong handleSelectChat)
    let userId;
    if (actualUserType === 'instructor') {
      // Instructor luôn dùng phone làm ID
      userId = user?.phone || user?.phoneNumber || user?.id;
      const rawId = user?.phone || user?.phoneNumber || user?.id;
      userId = rawId?.startsWith('0') ? `+84${rawId.slice(1)}` : rawId;
    } else {
      // Student luôn dùng email làm ID
      userId = user?.email || user?.id;
    }
    const userName = user?.name || 'Unknown User';
    
    if (!userId) {
      console.error("Unable to send message: User ID not available", user);
      return;
    }
    
    // Chuẩn hóa ID người nhận tin nhắn (giống như trong handleSelectChat)
    let chatUserId;
    if (selectedChat.userType === 'instructor') {
      // Instructor luôn dùng phone làm ID
      chatUserId = selectedChat?.phone || selectedChat?.id;
      const rawChatId = selectedChat?.phone || selectedChat?.id;
      chatUserId = rawChatId?.startsWith('0') ? `+84${rawChatId.slice(1)}` : rawChatId;
    } else {
      // Student luôn dùng email làm ID
      chatUserId = selectedChat?.email || selectedChat?.id;
    }
    
    // Create room ID (alphabetically sorted to ensure consistency)
    const participants = [chatUserId, userId].sort();
    const roomId = `chat_${participants[0]}_${participants[1]}`;
    
    console.log('Sending message with roomId:', roomId);
    
    // Create a unique temp ID for this message
    const tempId = Date.now();
    
    // Create message data with specific recipient
    const messageData = {
      roomId,
      from: userId,
      fromName: userName,
      fromType: actualUserType,
      message: message.trim(),
      tempId: tempId,
      to: chatUserId // Chỉ định rõ người nhận tin nhắn
    };
    
    console.log('Sending message data:', messageData);
    
    // Add to local state immediately before sending
    setMessages(prev => [...prev, {
      id: tempId,
      sender: userName,
      content: message.trim(),
      timestamp: new Date(),
      isOwn: true,
      pending: true,
      to: chatUserId, // Include recipient info in local state too
      from: userId
    }]);
    
    // Send through socket
    socket.emit('send-message', messageData, (ack) => {
      if (ack && ack.error) {
        console.error('Error sending message:', ack.error);
        // Update message status to error
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId 
              ? { ...msg, error: true, pending: false } 
              : msg
          )
        );
      } else {
        console.log('Message sent acknowledgement:', ack);
      }
    });
    
    // Clear input
    setMessage('');
  };
  
  // Debug function to log the internal properties of an object
  const debugObject = (obj, label = 'Object') => {
    console.log(`Debug ${label}:`, {
      type: typeof obj,
      value: obj,
      keys: obj ? Object.keys(obj) : null,
      isDate: obj instanceof Date,
      toString: obj ? obj.toString() : null
    });
  };
  
  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    debugObject(timestamp, 'Timestamp');
    
    try {
      // Ensure timestamp is properly converted to a Date object
      let date;
      
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string' && timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        // Chuẩn ISO string
        date = new Date(timestamp);
      } else if (!isNaN(Number(timestamp))) {
        // Unix timestamp (milliseconds)
        date = new Date(Number(timestamp));
      } else if (timestamp && timestamp._seconds) {
        // Firestore timestamp
        date = new Date(timestamp._seconds * 1000);
      } else if (timestamp && timestamp.seconds) {
        // Firestore timestamp format
        date = new Date(timestamp.seconds * 1000);
      } else {
        // Trường hợp khác
        date = new Date(timestamp);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', timestamp);
        // Return current time as fallback
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting date:', error, timestamp);
      // Return current time as fallback
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };
  
  return (
    <div className="row h-100">
      {/* Chat users list */}
      <div className="col-md-4 p-0 border-end">
        <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Conversations</h5>
          <span className={`badge ${socketStatus === 'connected' ? 'bg-success' : 'bg-danger'}`}>
            {socketStatus === 'connected' ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <div className="list-group list-group-flush">
          {loading ? (
            <div className="d-flex justify-content-center p-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : chatUsers.length === 0 ? (
            <div className="p-4 text-center text-muted">
              No conversations available
            </div>
          ) : (
            chatUsers.map(chatUser => (
              <button
                key={chatUser.id}
                className={`list-group-item list-group-item-action d-flex align-items-center ${
                  selectedChat?.id === chatUser.id ? 'active' : ''
                }`}
                onClick={() => handleSelectChat(chatUser)}
              >
                <div className="me-3">
                  <div className={`rounded-circle d-flex align-items-center justify-content-center ${
                    selectedChat?.id === chatUser.id ? 'bg-white text-primary' : 'bg-primary text-white'
                  }`} style={{ width: '40px', height: '40px' }}>
                    {chatUser.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="fw-bold">{chatUser.name}</div>
                  <small className={selectedChat?.id === chatUser.id ? 'text-white-50' : 'text-muted'}>
                    {chatUser.online ? 'Online' : 'Offline'}
                  </small>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* Chat messages area */}
      <div className="col-md-8 p-0 d-flex flex-column">
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="p-3 bg-primary text-white">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center" 
                      style={{ width: '40px', height: '40px' }}>
                    {selectedChat.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h6 className="mb-0">{selectedChat.name}</h6>
                  <small className="text-white-50">
                    {selectedChat.online ? 'Online' : 'Offline'}
                  </small>
                </div>
              </div>
            </div>
            
            {/* Messages */}
            <div className="p-3 flex-grow-1 overflow-auto bg-light">
              {messages.map(msg => (
                <div 
                  key={`${msg.id}-${typeof msg.timestamp === 'object' ? msg.timestamp.getTime() : msg.timestamp}`} 
                  className={`mb-3 d-flex ${msg.isOwn ? 'justify-content-end' : msg.isSystem ? 'justify-content-center' : ''}`}
                >
                  {msg.isSystem ? (
                    <div className="text-center text-muted small py-2 px-3 bg-white rounded">
                      {msg.content}
                    </div>
                  ) : (
                    <div className={`p-3 rounded ${
                      msg.isOwn ? 'bg-primary text-white' : 'bg-white'
                    }`} style={{ maxWidth: '75%' }}>
                      {!msg.isOwn && <div className="fw-bold mb-1">{msg.sender}</div>}
                      <div>{msg.content}</div>
                      <div className="text-end mt-1">
                        <small className={msg.isOwn ? 'text-white-50' : 'text-muted'}>
                          {formatTime(msg.timestamp)}
                          {msg.pending && ' (sending...)'}
                        </small>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messageListRef} />
            </div>
            
            {/* Message input */}
            <div className="p-3 border-top">
              <form onSubmit={handleSendMessage}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">
                    Send
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-light text-center p-4">
            <div className="mb-3" style={{ fontSize: '3rem' }}>💬</div>
            <h5>Select a conversation</h5>
            <p className="text-muted">Choose a person from the list to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleChatContainer;