import React, { useRef, useEffect } from 'react';

const UserVideo = ({ 
  stream, 
  isMuted = false, 
  isVideoEnabled = true,
  username = '', 
  isLocal = false,
  isScreenShare = false,
  className = '',
  fullScreen = false,
  onClick = () => {}
}) => {
  const videoRef = useRef(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  const videoClasses = `
    ${className}
    ${fullScreen ? 'fixed inset-0 z-50 bg-black' : 'rounded-lg overflow-hidden bg-gray-800 relative'}
    ${!isVideoEnabled && !isScreenShare ? 'bg-gray-700' : ''}
  `;
  
  // Enter fullscreen mode when fullScreen is true
  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (fullScreen && videoElement) {
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen();
      } else if (videoElement.webkitRequestFullscreen) {
        videoElement.webkitRequestFullscreen();
      } else if (videoElement.msRequestFullscreen) {
        videoElement.msRequestFullscreen();
      }
    }
  }, [fullScreen]);
  
  return (
    <div 
      className={videoClasses}
      onClick={onClick}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isMuted}
        className={`
          ${isVideoEnabled || isScreenShare ? 'w-full h-full object-cover' : 'hidden'}
          ${fullScreen ? 'w-screen h-screen' : ''}
        `}
      />
      
      {(!isVideoEnabled && !isScreenShare) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-indigo-600 rounded-full w-16 h-16 flex items-center justify-center text-white text-2xl font-semibold">
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
        <div className="text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded-md">
          {username} {isLocal && '(You)'}
        </div>
        
        <div className="flex space-x-1">
          {isMuted && (
            <div className="bg-red-500 p-1 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z" />
                <path d="M10.5 1.5a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0v-1zm2.305 1.277a.5.5 0 0 1 .518.128l.5.5a.5.5 0 0 1-.708.708l-.5-.5a.5.5 0 0 1 .19-.836z" />
                <path d="M1.705 8.005a.5.5 0 0 1 .512-.988l.167.086a.5.5 0 0 1-.512.988l-.167-.086zM8.5 1.873a.5.5 0 1 0-1 0v1a.5.5 0 0 0 1 0v-1z" />
                <path d="M8 17h8a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4h-6.172a2 2 0 0 0-1.414.586L3.828 8.172A2 2 0 0 0 3.243 9.586 2 2 0 0 0 3 10v3a4 4 0 0 0 4 4zm12-7a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1z" />
              </svg>
            </div>
          )}
          
          {isScreenShare && (
            <div className="bg-green-500 p-1 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserVideo;