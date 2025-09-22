import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import chatService from '../services/chatService';
import '../styles/Chat.css';

const ChatList = ({ onSelectChat, activeRoomId }) => {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch chat rooms when component mounts
  useEffect(() => {
    if (!user?.id) return;

    const fetchChatRooms = async () => {
      setLoading(true);
      try {
        const result = await chatService.getChatRooms(user.id);
        if (result.success) {
          setChatRooms(result.rooms || []);
        } else {
          setError('Failed to load chat rooms');
        }
      } catch (err) {
        setError('Error loading chat rooms');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChatRooms();
    
    // Set up event listener for new messages
    const handleMessageReceived = (message) => {
      // Update the chat room list to reflect new messages
      setChatRooms(prevRooms => {
        return prevRooms.map(room => {
          if (room.id === message.roomId) {
            return {
              ...room,
              lastMessage: message.message,
              lastMessageAt: message.timestamp,
              lastMessageFrom: message.fromName,
              unreadCount: message.from !== user.id ? (room.unreadCount || 0) + 1 : room.unreadCount
            };
          }
          return room;
        });
      });
    };
    
    // Listen for message received events
    chatService.addListener('messageReceived', handleMessageReceived);
    
    // Listen for messages being read
    chatService.addListener('messagesRead', (data) => {
      if (data.readBy === user.id) {
        // Update read status in chat rooms list
        setChatRooms(prevRooms => {
          return prevRooms.map(room => {
            if (room.id === data.roomId) {
              return {
                ...room,
                unreadCount: 0
              };
            }
            return room;
          });
        });
      }
    });
    
    // Cleanup function
    return () => {
      chatService.removeListener('messageReceived', handleMessageReceived);
    };
  }, [user]);

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    
    // If same day, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If within the last week, show day of week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    if (date > oneWeekAgo) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString();
  };

  // Get the other participant in a chat (not the current user)
  const getOtherParticipant = (room) => {
    if (!room.participants || !user) return { name: 'Unknown' };
    
    // Find participant that is not the current user
    const otherParticipant = room.participants.find(p => p.id !== user.id);
    return otherParticipant || { name: 'Unknown' };
  };

  // Handle click on a chat room
  const handleSelectChat = (room) => {
    const otherParticipant = getOtherParticipant(room);
    onSelectChat(room.id, otherParticipant.name, otherParticipant.userType);
    
    // Mark messages as read when selecting a chat
    if (user?.id) {
      chatService.markMessagesAsRead(room.id, user.id);
      
      // Update local state to show as read
      setChatRooms(prevRooms => {
        return prevRooms.map(r => {
          if (r.id === room.id) {
            return { ...r, unreadCount: 0 };
          }
          return r;
        });
      });
    }
  };

  if (loading) {
    return (
      <div className="chat-list-container text-center p-3">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-list-container">
        <div className="alert alert-danger m-3">{error}</div>
      </div>
    );
  }

  return (
    <div className="chat-list-container">
      {chatRooms.length === 0 ? (
        <div className="text-center text-muted p-3">
          No conversations yet
        </div>
      ) : (
        chatRooms.map((room) => {
          const otherParticipant = getOtherParticipant(room);
          const isActive = room.id === activeRoomId;
          const hasUnread = (room.unreadCount || 0) > 0;
          
          return (
            <div
              key={room.id}
              className={`chat-list-item ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectChat(room)}
            >
              <div className="chat-list-item-header">
                <div className="chat-list-item-name">
                  {otherParticipant.name || 'Unknown'}
                  {otherParticipant.userType && (
                    <span className="badge bg-secondary ms-1">
                      {otherParticipant.userType}
                    </span>
                  )}
                </div>
                <div className="chat-list-item-time">
                  {formatTime(room.lastMessageAt)}
                </div>
              </div>
              <div className={`chat-list-item-message ${hasUnread ? 'chat-list-item-unread' : ''}`}>
                {room.lastMessageFrom && (
                  <span>
                    {room.lastMessageFrom === user?.name ? 'You: ' : ''}
                  </span>
                )}
                {room.lastMessage || 'No messages yet'}
                {hasUnread && (
                  <span className="chat-list-item-unread-count">
                    {room.unreadCount}
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ChatList;