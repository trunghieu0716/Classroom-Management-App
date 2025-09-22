import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import chatService from '../services/chatService';
import '../styles/Chat.css';

const ChatInterface = ({ roomId, recipientName, recipientType }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const messageListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Connect to socket and load chat history when component mounts
  useEffect(() => {
    if (!user || !roomId) return;

    // Connect to socket if not already connected
    chatService.connect(user);

    // Join the chat room
    chatService.joinChatRoom(roomId);

    // Load chat history
    fetchChatHistory();

    // Mark messages as read when chat is opened
    if (user?.id) {
      chatService.markMessagesAsRead(roomId, user.id);
    }

    // Set up event listeners
    const handleMessageReceived = (message) => {
      if (message.from !== user.id) {
        // Mark as read if we're currently in this chat
        chatService.markMessagesAsRead(roomId, user.id);
      }
      
      setMessages(prevMessages => {
        // Check if we already have this message (avoid duplicates)
        const exists = prevMessages.some(m => m.id === message.id);
        if (exists) return prevMessages;
        return [...prevMessages, message];
      });
    };

    const handleUserTyping = (data) => {
      if (data.isTyping && data.userName !== user.name) {
        setIsTyping(true);
        setTypingUser(data.userName);
      } else {
        setIsTyping(false);
        setTypingUser(null);
      }
    };

    // Add event listeners
    chatService.addListener('messageReceived', handleMessageReceived);
    chatService.addListener('userTyping', handleUserTyping);

    // Cleanup function
    return () => {
      chatService.removeListener('messageReceived', handleMessageReceived);
      chatService.removeListener('userTyping', handleUserTyping);
    };
  }, [user, roomId]);

  // Fetch chat history from API
  const fetchChatHistory = async () => {
    if (!roomId) return;
    
    setLoading(true);
    try {
      const result = await chatService.getChatHistory(roomId);
      if (result.success) {
        setMessages(result.messages || []);
      } else {
        setError('Failed to load chat history');
      }
    } catch (err) {
      setError('Error loading chat history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;
    
    // Create a temporary message object with local ID
    const tempId = `temp-${Date.now()}`;
    const messageData = {
      roomId,
      from: user.id,
      fromName: user.name,
      fromType: user.userType,
      message: newMessage.trim(),
      messageType: 'text',
      tempId
    };
    
    // Add message to local state immediately for UI responsiveness
    setMessages(prevMessages => [
      ...prevMessages, 
      {
        id: tempId,
        ...messageData,
        timestamp: new Date(),
        read: false,
        pending: true
      }
    ]);
    
    // Clear input
    setNewMessage('');
    
    // Send via socket
    const sent = chatService.sendMessage(messageData);
    if (!sent) {
      // Handle sending failure
      setError('Failed to send message. Please try again.');
    }
  };

  // Handle typing indicator
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (user && roomId) {
      chatService.sendTypingStatus(roomId, user, true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        chatService.sendTypingStatus(roomId, user, false);
      }, 3000);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Determine if a message is from the current user
  const isCurrentUserMessage = (message) => {
    return message.from === user?.id;
  };

  if (!roomId) {
    return (
      <div className="chat-empty-state">
        <i className="bi bi-chat-dots"></i>
        <p>Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="user-status offline"></div>
          <h3>{recipientName || 'Chat'}</h3>
        </div>
      </div>
      
      <div className="chat-body">
        {loading ? (
          <div className="text-center p-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <div className="message-list" ref={messageListRef}>
            {messages.length === 0 ? (
              <div className="text-center text-muted p-3">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${isCurrentUserMessage(message) ? 'message-outgoing' : 'message-incoming'}`}
                >
                  <div className="message-content">{message.message}</div>
                  <div className="message-time">
                    {formatTime(message.timestamp)}
                  </div>
                  {isCurrentUserMessage(message) && (
                    <div className="message-status">
                      {message.pending ? 'Sending...' : message.read ? 'Read' : 'Delivered'}
                    </div>
                  )}
                </div>
              ))
            )}
            
            {isTyping && (
              <div className="typing-indicator">
                {typingUser || 'Someone'} is typing...
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="chat-footer">
        <form className="message-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="message-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleInputChange}
            disabled={!user}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!newMessage.trim() || !user}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
