import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import ChatList from './ChatList';
import ChatInterface from './ChatInterface';
import chatService from '../services/chatService';
import '../styles/Chat.css';

const ChatContainer = () => {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientType, setRecipientType] = useState('');
  
  // Connect to socket when component mounts
  useEffect(() => {
    if (user) {
      chatService.connect(user);
    }
    
    // Clean up on unmount
    return () => {
      chatService.disconnect();
    };
  }, [user]);

  // Handle chat selection
  const handleSelectChat = (roomId, name, type) => {
    setActiveChat(roomId);
    setRecipientName(name);
    setRecipientType(type);
  };

  return (
    <div className="row h-100">
      <div className="col-md-4 p-0 border-end">
        <ChatList 
          onSelectChat={handleSelectChat} 
          activeRoomId={activeChat} 
        />
      </div>
      <div className="col-md-8 p-0">
        <ChatInterface 
          roomId={activeChat}
          recipientName={recipientName}
          recipientType={recipientType}
        />
      </div>
    </div>
  );
};

export default ChatContainer;