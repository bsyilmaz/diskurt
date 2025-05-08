import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import Button from './Button';
import EmojiPicker from 'emoji-picker-react';

const ChatBox = ({ className = '' }) => {
  const { messages, sendMessage, username, users } = useSocket();
  const [messageInput, setMessageInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput);
      setMessageInput('');
    }
  };
  
  const handleEmojiClick = (emojiData) => {
    setMessageInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Get display name for a user ID
  const getUsernameById = (userId) => {
    const user = users.find(user => user.id === userId);
    return user ? user.username : 'Unknown User';
  };
  
  // Format message for display
  const renderMessage = (message) => {
    const isCurrentUser = message.senderId && message.sender === username;
    
    if (message.type === 'system') {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs">
            {message.content}
          </div>
        </div>
      );
    }
    
    return (
      <div 
        key={message.id} 
        className={`flex mb-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
      >
        <div 
          className={`px-3 py-2 rounded-lg max-w-[75%] ${
            isCurrentUser 
              ? 'bg-indigo-600 text-white rounded-br-none' 
              : 'bg-gray-200 text-gray-800 rounded-bl-none'
          }`}
        >
          {!isCurrentUser && (
            <div className="text-xs font-bold mb-1">
              {message.sender}
            </div>
          )}
          <div className="break-words">{message.content}</div>
          <div className={`text-xs mt-1 text-right ${isCurrentUser ? 'text-indigo-100' : 'text-gray-500'}`}>
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className={`bg-white rounded-lg shadow flex flex-col ${className} ${isExpanded ? 'h-full' : 'h-12'}`}>
      {/* Chat header */}
      <div 
        className="bg-gray-100 py-2 px-4 rounded-t-lg flex justify-between items-center cursor-pointer"
        onClick={toggleExpand}
      >
        <h3 className="font-medium">Chat</h3>
        <button className="text-gray-500 focus:outline-none">
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
      
      {isExpanded && (
        <>
          {/* Messages container */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-4">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map(message => renderMessage(message))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message input */}
          <form 
            className="p-2 border-t flex items-center relative" 
            onSubmit={handleSendMessage}
          >
            {/* Emoji button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-gray-500 hover:text-indigo-600 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Emoji picker dropdown */}
            {showEmojiPicker && (
              <div 
                className="absolute bottom-14 left-0 z-10" 
                ref={emojiPickerRef}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  lazyLoadEmojis
                  searchDisabled
                />
              </div>
            )}
            
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 mx-2 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!messageInput.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Button>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatBox; 