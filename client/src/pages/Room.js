import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import UserVideo from '../components/UserVideo';
import MediaControls from '../components/MediaControls';
import ChatBox from '../components/ChatBox';
import UserList from '../components/UserList';

const Room = () => {
  const {
    roomId,
    username,
    users,
    stream,
    screenStream,
    isMuted,
    isVideoOn,
    isScreenSharing,
    userVideoRef,
    screenVideoRef,
    peersRef,
  } = useSocket();
  
  const [activeFullscreen, setActiveFullscreen] = useState(null);
  const [layout, setLayout] = useState('grid');
  const [showChat, setShowChat] = useState(true);
  const [showUserList, setShowUserList] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'users'
  
  // Handle peer video streams
  const [peerStreams, setPeerStreams] = useState({});
  
  useEffect(() => {
    // Set up peer stream handlers
    const streamHandlers = {};
    
    Object.entries(peersRef.current).forEach(([peerId, peer]) => {
      if (!streamHandlers[peerId]) {
        streamHandlers[peerId] = stream => {
          setPeerStreams(prev => ({
            ...prev,
            [peerId]: stream
          }));
        };
        
        peer.on('stream', streamHandlers[peerId]);
      }
    });
    
    return () => {
      // Clean up stream handlers
      Object.entries(peersRef.current).forEach(([peerId, peer]) => {
        if (streamHandlers[peerId]) {
          peer.off('stream', streamHandlers[peerId]);
        }
      });
    };
  }, [peersRef]);
  
  // Toggle fullscreen for a video
  const toggleFullscreen = (id) => {
    if (activeFullscreen === id) {
      setActiveFullscreen(null);
    } else {
      setActiveFullscreen(id);
    }
  };
  
  // Get the correct user object for a peer ID
  const getUserForPeerId = (peerId) => {
    return users.find(user => user.id === peerId) || { username: 'Unknown User' };
  };
  
  // Determine grid classes based on number of participants
  const getGridClasses = () => {
    const totalVideos = users.length + (isScreenSharing ? 1 : 0);
    
    if (totalVideos === 1) {
      return 'grid-cols-1';
    } else if (totalVideos === 2) {
      return 'grid-cols-1 md:grid-cols-2';
    } else if (totalVideos <= 4) {
      return 'grid-cols-1 sm:grid-cols-2';
    } else if (totalVideos <= 9) {
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    } else {
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
  };
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowChat(!showChat);
  };
  
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 py-2 px-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Diskurt</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm bg-gray-700 px-3 py-1 rounded-full">
            Room: {roomId} ({users.length}/10 users)
          </div>
          <button 
            onClick={toggleSidebar}
            className="flex items-center text-sm bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-full"
          >
            {showChat ? 'Hide Sidebar' : 'Show Sidebar'}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 ml-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 6h16M4 12h16m-7 6h7" 
              />
            </svg>
          </button>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 overflow-hidden p-4 flex flex-col lg:flex-row gap-4">
        {/* Video section - takes full width if sidebar is hidden, otherwise takes 2/3 */}
        <div className={`${showChat ? 'lg:w-2/3' : 'w-full'} flex flex-col h-full`}>
          {/* Layout controls */}
          <div className="mb-4 flex items-center justify-end space-x-2">
            <button
              className={`px-2 py-1 rounded ${layout === 'grid' ? 'bg-indigo-600' : 'bg-gray-700'}`}
              onClick={() => setLayout('grid')}
            >
              Grid
            </button>
            <button
              className={`px-2 py-1 rounded ${layout === 'speaker' ? 'bg-indigo-600' : 'bg-gray-700'}`}
              onClick={() => setLayout('speaker')}
            >
              Speaker View
            </button>
          </div>
          
          {/* Video grid */}
          {layout === 'grid' && (
            <div className={`grid ${getGridClasses()} gap-4 h-full max-h-[calc(100vh-200px)]`}>
              {/* Current user video */}
              <UserVideo
                stream={stream}
                username={username}
                isLocal={true}
                isMuted={isMuted}
                isVideoEnabled={isVideoOn}
                className="w-full h-full max-h-[calc((100vh-200px)/2)]"
                fullScreen={activeFullscreen === 'local'}
                onClick={() => toggleFullscreen('local')}
              />
              
              {/* Screen sharing video (if active) */}
              {isScreenSharing && (
                <UserVideo
                  stream={screenStream}
                  username={`${username}'s Screen`}
                  isLocal={true}
                  isScreenShare={true}
                  className="w-full h-full max-h-[calc((100vh-200px)/2)]"
                  fullScreen={activeFullscreen === 'screen'}
                  onClick={() => toggleFullscreen('screen')}
                />
              )}
              
              {/* Other participants' videos */}
              {Object.entries(peerStreams).map(([peerId, peerStream]) => {
                const user = getUserForPeerId(peerId);
                return (
                  <UserVideo
                    key={peerId}
                    stream={peerStream}
                    username={user.username}
                    isMuted={user.isMuted}
                    isVideoEnabled={user.isVideoOn}
                    isScreenShare={user.isScreenSharing}
                    className="w-full h-full max-h-[calc((100vh-200px)/2)]"
                    fullScreen={activeFullscreen === peerId}
                    onClick={() => toggleFullscreen(peerId)}
                  />
                );
              })}
            </div>
          )}
          
          {/* Speaker view */}
          {layout === 'speaker' && (
            <div className="flex flex-col h-full max-h-[calc(100vh-200px)]">
              {/* Main video (active speaker or screen share) */}
              <div className="flex-1 mb-4">
                {isScreenSharing ? (
                  <UserVideo
                    stream={screenStream}
                    username={`${username}'s Screen`}
                    isLocal={true}
                    isScreenShare={true}
                    className="w-full h-full"
                    fullScreen={activeFullscreen === 'screen'}
                    onClick={() => toggleFullscreen('screen')}
                  />
                ) : (
                  <UserVideo
                    stream={stream}
                    username={username}
                    isLocal={true}
                    isMuted={isMuted}
                    isVideoEnabled={isVideoOn}
                    className="w-full h-full"
                    fullScreen={activeFullscreen === 'local'}
                    onClick={() => toggleFullscreen('local')}
                  />
                )}
              </div>
              
              {/* Thumbnails of other participants */}
              <div className="flex overflow-x-auto space-x-2 pb-2">
                {/* Local user thumbnail (if not main) */}
                {isScreenSharing && (
                  <UserVideo
                    stream={stream}
                    username={username}
                    isLocal={true}
                    isMuted={isMuted}
                    isVideoEnabled={isVideoOn}
                    className="w-48 h-32 flex-shrink-0"
                    onClick={() => toggleFullscreen('local')}
                  />
                )}
                
                {/* Other participants */}
                {Object.entries(peerStreams).map(([peerId, peerStream]) => {
                  const user = getUserForPeerId(peerId);
                  return (
                    <UserVideo
                      key={peerId}
                      stream={peerStream}
                      username={user.username}
                      isMuted={user.isMuted}
                      isVideoEnabled={user.isVideoOn}
                      isScreenShare={user.isScreenSharing}
                      className="w-48 h-32 flex-shrink-0"
                      onClick={() => toggleFullscreen(peerId)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar section - 1/3 of screen on larger devices */}
        {showChat && (
          <div className="lg:w-1/3 h-[calc(100vh-200px)] flex flex-col">
            {/* Tab navigation */}
            <div className="flex mb-2 bg-gray-800 rounded-t-lg overflow-hidden">
              <button
                className={`flex-1 py-2 text-center font-medium ${
                  activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
                onClick={() => setActiveTab('chat')}
              >
                Chat
              </button>
              <button
                className={`flex-1 py-2 text-center font-medium ${
                  activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
                onClick={() => setActiveTab('users')}
              >
                Participants
              </button>
            </div>
            
            {/* Tab content */}
            <div className="flex-1">
              {activeTab === 'chat' && <ChatBox className="h-full" />}
              {activeTab === 'users' && <UserList className="h-full" />}
            </div>
          </div>
        )}
      </main>
      
      {/* Media controls */}
      <div className="p-4 flex justify-center">
        <MediaControls className="w-full max-w-xl" />
      </div>
    </div>
  );
};

export default Room; 