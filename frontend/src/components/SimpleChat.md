// Hướng dẫn kết nối SimpleChatContainer với API mới

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import { io } from 'socket.io-client';
import { INSTRUCTOR_ROOM, getStudentRoomId } from '../config/chatRooms';

const SimpleChat = ({ userType }) => {
const { user } = useAuth();
const socket = useRef(null);
const [messages, setMessages] = useState([]);
const [newMessage, setNewMessage] = useState('');

// Kết nối socket khi component mount
useEffect(() => {
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // Thiết lập kết nối socket
    socket.current = io(apiUrl, {
      transports: ['polling', 'websocket'],
      reconnection: true
    });

    // Xử lý khi kết nối thành công
    socket.current.on('connect', () => {
      console.log('Connected to socket server');

      // Xác thực người dùng
      if (user) {
        socket.current.emit('user-authenticated', {
          phone: user.email || user.phone,
          userType: userType,
          name: user.name
        });
      }
    });

    // Xử lý khi nhận tin nhắn mới
    socket.current.on('receive-message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    // Cleanup khi unmount
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };

}, [user, userType]);

// Tham gia phòng chat khi đăng nhập thành công
useEffect(() => {
if (!socket.current || !user) return;

    // Tham gia phòng chat chung
    socket.current.emit('join-chat-room', INSTRUCTOR_ROOM);

    // Nếu là học viên, tham gia thêm phòng riêng
    if (userType === 'student') {
      const studentId = user.email || user.phone;
      socket.current.emit('join-chat-room', getStudentRoomId(studentId));
    }

    // Lấy lịch sử chat
    fetchChatHistory();

}, [socket.current, user]);

// Lấy lịch sử chat
const fetchChatHistory = async () => {
try {
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const response = await fetch(`${apiUrl}/api/chat/messages/${INSTRUCTOR_ROOM}`);
const data = await response.json();

      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }

};

// Gửi tin nhắn mới
const handleSendMessage = () => {
if (!newMessage.trim() || !socket.current) return;

    // Xác định phòng chat đích
    const roomId = INSTRUCTOR_ROOM;

    // Cấu trúc dữ liệu tin nhắn
    const messageData = {
      roomId,
      from: user.email || user.phone,
      fromName: user.name,
      fromType: userType,
      message: newMessage.trim(),
      tempId: Date.now()
    };

    // Gửi tin nhắn qua socket
    socket.current.emit('send-message', messageData);

    // Xóa input
    setNewMessage('');

};

return (
<div className="chat-container">
<div className="messages-container">
{messages.map(msg => (
<div
key={msg.id || msg.tempId}
className={`message ${msg.fromType === userType ? 'own' : 'other'}`} >
<div className="message-sender">{msg.fromName}</div>
<div className="message-content">{msg.message}</div>
<div className="message-time">
{new Date(msg.timestamp).toLocaleTimeString()}
</div>
</div>
))}
</div>

      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type your message here..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>

);
};

export default SimpleChat;
