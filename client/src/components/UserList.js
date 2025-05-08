import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';

const UserList = ({ className = '' }) => {
  const { users, username } = useSocket();
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Toggle expand/collapse
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`bg-white rounded-lg shadow flex flex-col ${className} ${isExpanded ? 'h-full' : 'h-12'}`}>
      {/* Header */}
      <div 
        className="bg-gray-100 py-2 px-4 rounded-t-lg flex justify-between items-center cursor-pointer"
        onClick={toggleExpand}
      >
        <h3 className="font-medium">Participants ({users.length})</h3>
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
      
      {/* User list */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto bg-gray-50 p-2">
          {users.map(user => (
            <div 
              key={user.id} 
              className="flex items-center justify-between p-2 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold mr-2">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-800">
                    {user.username} {user.id === username ? '(You)' : ''}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-1">
                {user.isMuted && (
                  <div className="bg-red-100 p-1 rounded-md" title="Microphone muted">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                    </svg>
                  </div>
                )}
                
                {!user.isVideoOn && (
                  <div className="bg-gray-100 p-1 rounded-md" title="Video off">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                    </svg>
                  </div>
                )}
                
                {user.isScreenSharing && (
                  <div className="bg-green-100 p-1 rounded-md" title="Sharing screen">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserList; 