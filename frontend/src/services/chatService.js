import { io } from 'socket.io-client';
import api from './api';

class ChatService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    this.listeners = {
      messageReceived: [],
      connectionChanged: [],
      userTyping: [],
      messagesRead: [],
      userJoinedChat: []
    };
  }

  // Initialize socket connection
  connect(userData) {
    if (this.socket) {
      console.log('Socket connection already exists');
      return;
    }

    console.log('🔌 Connecting to socket server:', this.apiBaseUrl);
    this.socket = io(this.apiBaseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupEventListeners();

    // Authenticate user when connected
    this.socket.on('connect', () => {
      console.log('✅ Socket connected with ID:', this.socket.id);
      this.connected = true;
      this.notifyListeners('connectionChanged', { connected: true });
      
      if (userData) {
        this.authenticateUser(userData);
      }
    });
  }

  // Setup standard event listeners
  setupEventListeners() {
    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      this.connected = false;
      this.notifyListeners('connectionChanged', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('⚠️ Socket connection error:', error);
      this.notifyListeners('connectionChanged', { 
        connected: false, 
        error: 'Failed to connect to chat server' 
      });
    });

    this.socket.on('receive-message', (message) => {
      console.log('📩 Message received:', message);
      this.notifyListeners('messageReceived', message);
    });

    this.socket.on('user-typing', (data) => {
      this.notifyListeners('userTyping', data);
    });

    this.socket.on('messages-read', (data) => {
      this.notifyListeners('messagesRead', data);
    });
    
    this.socket.on('user-joined-chat', (data) => {
      console.log('👋 User joined chat:', data);
      this.notifyListeners('userJoinedChat', data);
    });

    this.socket.on('message-sent', (confirmation) => {
      console.log('✅ Message sent confirmation:', confirmation);
    });

    this.socket.on('message-error', (error) => {
      console.error('❌ Message error:', error);
    });
  }

  // Authenticate the user
  authenticateUser(userData) {
    if (!this.socket || !this.connected) {
      console.error('Cannot authenticate: Socket not connected');
      return;
    }

    console.log('🔐 Authenticating socket user:', userData.name);
    this.socket.emit('user-authenticated', {
      phone: userData.id || userData.email || userData.phone,
      userType: userData.userType,
      name: userData.name
    });
  }

  // Join a chat room
  joinChatRoom(roomId) {
    if (!this.socket || !this.connected) {
      console.error('Cannot join room: Socket not connected');
      return;
    }

    console.log(`🚪 Joining chat room: ${roomId}`);
    this.socket.emit('join-chat-room', roomId);
  }

  // Send a message
  sendMessage(messageData) {
    if (!this.socket || !this.connected) {
      console.error('Cannot send message: Socket not connected');
      return false;
    }

    console.log('📤 Sending message:', messageData);
    this.socket.emit('send-message', messageData);
    return true;
  }

  // Send typing indicator
  sendTypingStatus(roomId, userData, isTyping) {
    if (!this.socket || !this.connected) return;
    
    const eventName = isTyping ? 'typing-start' : 'typing-stop';
    this.socket.emit(eventName, {
      roomId,
      userName: userData.name,
      userType: userData.userType
    });
  }

  // Mark messages as read
  markMessagesAsRead(roomId, userId) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('mark-messages-read', {
      roomId,
      userId
    });
  }

  // Fetch chat history from API
  async getChatHistory(roomId, limit = 50) {
    try {
      const response = await api.get(`/chat/messages/${roomId}?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      return { success: false, error: error.message, messages: [] };
    }
  }

  // Get user's chat rooms
  async getChatRooms(userId) {
    try {
      const response = await api.get(`/chat/chatRooms/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch chat rooms:', error);
      return { success: false, error: error.message, rooms: [] };
    }
  }

  // Add event listener
  addListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  // Remove event listener
  removeListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  // Notify all listeners for an event
  notifyListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

// Create singleton instance
const chatService = new ChatService();
export default chatService;
