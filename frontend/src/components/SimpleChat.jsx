import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import { io } from 'socket.io-client';
import '../styles/Chat.css';

const SimpleChat = ({ userType }) => {
  const { user } = useAuth();
  const actualUserType = userType || user?.userType;
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatUsers, setChatUsers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const chatHistoryCache = useRef({}); // Cache for chat history

  // Connect to socket when component mounts
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    console.log('Connecting to socket server:', apiUrl);
    
    const socketConnection = io(apiUrl, {
      transports: ['polling', 'websocket'], 
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000
    });
    
    setSocket(socketConnection);
    
    // Set up socket event listeners
    socketConnection.on('connect', () => {
      console.log('Socket connected:', socketConnection.id);
      setConnected(true);
      
      // Authenticate user if logged in
      if (user) {
        const userId = user.id || user.email || user.phone;
        socketConnection.emit('user-authenticated', {
          phone: userId,
          userType: actualUserType,
          name: user.name || 'Unknown User'
        });
      }
    });
    
    socketConnection.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });
    
    socketConnection.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });
    
    // Clean up on unmount
    return () => {
      if (socketConnection) {
        socketConnection.disconnect();
      }
    };
  }, [user, actualUserType]);
  
  // Fetch chat users list
  useEffect(() => {
    const fetchChatUsers = async () => {
      try {
        if (!user) return;
        
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        // Get appropriate user list (instructors for students, students for instructors)
        const endpoint = actualUserType === 'student' 
          ? `${apiUrl}/api/instructor` 
          : `${apiUrl}/api/student`;
        
        const response = await fetch(endpoint);
        const text = await response.text();
        let data;
        
        try {
          data = JSON.parse(text);
        } catch (error) {
          console.error('Error parsing data:', error);
          return;
        }
        
        // Process data and update chat users list
        if (actualUserType === 'student' && data.instructors) {
          setChatUsers(data.instructors.map(instructor => ({
            id: instructor.phone || instructor.id,
            name: instructor.name,
            userType: 'instructor',
            online: false
          })));
        } else if (actualUserType === 'instructor' && data.students) {
          setChatUsers(data.students.map(student => ({
            id: student.email || student.id,
            name: student.name,
            userType: 'student',
            online: false
          })));
        } else {
          console.error('No user data available');
        }
      } catch (error) {
        console.error('Error fetching chat users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChatUsers();
  }, [actualUserType, user]);
  
  // Listen for messages and other events
  useEffect(() => {
    if (!socket) return;
    
    // Handle received messages
    socket.on('receive-message', (message) => {
      console.log('Received message:', message);
      
      // Check if this is a message from/to the selected chat
      const currentUserId = user?.id || user?.email || user?.phone;
      
      // If we have a selected chat and message is for this chat
      if (selectedChat && 
          ((message.senderId === selectedChat.id && message.recipientId === currentUserId) || 
           (message.senderId === currentUserId && message.recipientId === selectedChat.id))) {
        
        // Check for duplicate messages
        setMessages(prev => {
          // Skip if duplicate
          const isDuplicate = prev.some(m => 
            m.id === message.id || 
            (message.tempId && m.tempId === message.tempId)
          );
          
          if (isDuplicate) return prev;
          
          // Add new message
          return [...prev, {
            id: message.id,
            tempId: message.tempId,
            senderId: message.senderId,
            senderName: message.senderName,
            senderType: message.senderType,
            content: message.message,
            timestamp: message.timestamp,
            isOwn: message.senderId === currentUserId
          }];
        });
      } else {
        console.log('Message not for current chat:', message);
        
        // If we received a message from someone we're not currently chatting with,
        // highlight that user or show a notification
        if (message.senderId !== currentUserId) {
          setChatUsers(prev => prev.map(user => 
            user.id === message.senderId
              ? { ...user, hasNewMessage: true }
              : user
          ));
        }
      }
    });
    
    // Handle message sent confirmation
    socket.on('message-sent', (confirmation) => {
      console.log('Message sent confirmation:', confirmation);
      
      // Update temporary message with real ID
      setMessages(prev => prev.map(msg => 
        msg.tempId === confirmation.tempId
          ? { 
              ...msg, 
              id: confirmation.messageId, 
              timestamp: confirmation.timestamp,
              pending: false 
            }
          : msg
      ));
    });
    
    // Handle message errors
    socket.on('message-error', (error) => {
      console.error('Message error:', error);
      
      // Mark message as failed
      if (error.tempId) {
        setMessages(prev => prev.map(msg => 
          msg.tempId === error.tempId
            ? { ...msg, error: true, errorMessage: error.error, pending: false }
            : msg
        ));
      }
    });
    
    // Handle receiving chat history
    socket.on('chat-history', (history) => {
      console.log('Received chat history:', history);
      
      const { recipientId, messages: historyMessages } = history;
      
      // Only process if this is for our current selected chat
      if (selectedChat && selectedChat.id === recipientId) {
        // Format messages for our UI
        const currentUserId = user?.id || user?.email || user?.phone;
        
        const formattedMessages = historyMessages.map(msg => ({
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderType: msg.senderType,
          content: msg.message,
          timestamp: msg.timestamp,
          isOwn: msg.senderId === currentUserId
        }));
        
        // Update messages state with history
        setMessages(formattedMessages);
        
        // Cache this chat history
        chatHistoryCache.current[recipientId] = formattedMessages;
      }
    });
    
    // Handle online status updates
    socket.on('online-users', (onlineUsers) => {
      console.log('Online users:', onlineUsers);
      
      // Update online status for all users
      setChatUsers(prev => prev.map(chatUser => {
        const onlineUser = onlineUsers.find(user => user.id === chatUser.id);
        return {
          ...chatUser,
          online: !!onlineUser
        };
      }));
    });
    
    socket.on('user-online', (userData) => {
      console.log('User came online:', userData);
      
      setChatUsers(prev => prev.map(user => 
        user.id === userData.id
          ? { ...user, online: true }
          : user
      ));
    });
    
    socket.on('user-offline', (userData) => {
      console.log('User went offline:', userData);
      
      setChatUsers(prev => prev.map(user => 
        user.id === userData.id
          ? { ...user, online: false }
          : user
      ));
    });
    
    // Clean up event listeners
    return () => {
      socket.off('receive-message');
      socket.off('message-sent');
      socket.off('message-error');
      socket.off('chat-history');
      socket.off('online-users');
      socket.off('user-online');
      socket.off('user-offline');
    };
  }, [socket, user, selectedChat]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle selecting a chat user
  const handleSelectChat = (chatUser) => {
    setSelectedChat(chatUser);
    
    // Clear any "new message" indicator
    setChatUsers(prev => prev.map(user => 
      user.id === chatUser.id
        ? { ...user, hasNewMessage: false }
        : user
    ));
    
    // Check if we have cached messages
    if (chatHistoryCache.current[chatUser.id]) {
      setMessages(chatHistoryCache.current[chatUser.id]);
    } else {
      // Clear messages while loading new ones
      setMessages([]);
      
      // Request chat history from server
      if (socket && socket.connected) {
        socket.emit('get-chat-history', { 
          recipientId: chatUser.id 
        });
      }
    }
  };
  
  // Send a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !socket || !selectedChat) return;
    
    const tempId = `temp_${Date.now()}`;
    const currentUserId = user?.id || user?.email || user?.phone;
    
    // Add message to UI immediately
    setMessages(prev => [...prev, {
      tempId,
      senderId: currentUserId,
      senderName: user.name,
      senderType: actualUserType,
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      isOwn: true,
      pending: true
    }]);
    
    // Send message through socket
    socket.emit('send-message', {
      recipientId: selectedChat.id,
      message: inputMessage.trim(),
      tempId
    });
    
    // Clear input
    setInputMessage('');
  };
  
  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      
      // Check if valid date
      if (isNaN(date.getTime())) {
        return '';
      }
      
      // Format time
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };
  
  return (
    <div className="chat-container">
      {/* User list section */}
      <div className="chat-users-list">
        <div className="chat-header">
          <h3>Chat</h3>
          <span className={`connection-status ${connected ? 'online' : 'offline'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="users-container">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : chatUsers.length === 0 ? (
            <div className="no-users">No users available</div>
          ) : (
            chatUsers.map(chatUser => (
              <div 
                key={chatUser.id}
                className={`chat-user-item ${selectedChat?.id === chatUser.id ? 'selected' : ''} ${chatUser.hasNewMessage ? 'has-new-message' : ''}`}
                onClick={() => handleSelectChat(chatUser)}
              >
                <div className="user-avatar">
                  {chatUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">
                    {chatUser.name}
                    {chatUser.hasNewMessage && <span className="new-message-indicator">•</span>}
                  </div>
                  <div className={`user-status ${chatUser.online ? 'online' : 'offline'}`}>
                    {chatUser.online ? 'Active' : 'Offline'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Messages section */}
      <div className="chat-messages-area">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <div className="user-avatar">{selectedChat.name.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <div className="user-name">{selectedChat.name}</div>
                <div className={`user-status ${selectedChat.online ? 'online' : 'offline'}`}>
                  {selectedChat.online ? 'Active' : 'Offline'}
                </div>
              </div>
            </div>
            
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="no-messages">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id || msg.tempId}
                    className={`message ${msg.isOwn ? 'own' : ''} ${msg.pending ? 'pending' : ''} ${msg.error ? 'error' : ''}`}
                  >
                    <div className="message-content">
                      {!msg.isOwn && <div className="sender-name">{msg.senderName}</div>}
                      <div className="message-text">{msg.content}</div>
                      <div className="message-time">
                        {formatTime(msg.timestamp)}
                        {msg.pending && ' (sending...)'}
                        {msg.error && ' (failed)'}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form className="message-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={!connected}
              />
              <button type="submit" disabled={!connected || !inputMessage.trim()}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <div>Select a user to start chatting</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleChat;