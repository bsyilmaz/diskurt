import React, { useState } from 'react';
import Button from './Button';
import { useSocket } from '../context/SocketContext';

const MediaControls = ({ className = '' }) => {
  const { 
    isMuted, 
    isVideoOn, 
    isScreenSharing, 
    toggleMute, 
    toggleVideo, 
    toggleScreenShare,
    leaveRoom,
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    changeAudioDevice,
    changeVideoDevice
  } = useSocket();
  
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  
  return (
    <div className={`bg-gray-800 p-3 rounded-lg flex flex-wrap items-center justify-center space-x-2 ${className}`}>
      {/* Microphone toggle */}
      <Button
        variant={isMuted ? 'iconDanger' : 'iconPrimary'}
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </Button>
      
      {/* Camera toggle */}
      <Button
        variant={isVideoOn ? 'iconPrimary' : 'iconDanger'}
        onClick={toggleVideo}
        aria-label={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
        title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
      >
        {isVideoOn ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
          </svg>
        )}
      </Button>
      
      {/* Screen sharing */}
      <Button
        variant={isScreenSharing ? 'iconDanger' : 'iconPrimary'}
        onClick={toggleScreenShare}
        aria-label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
      >
        {isScreenSharing ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
      </Button>
      
      {/* Settings */}
      <Button
        variant="iconPrimary"
        onClick={() => setShowDeviceSettings(!showDeviceSettings)}
        aria-label="Settings"
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Button>
      
      {/* Leave room */}
      <Button
        variant="iconDanger"
        onClick={leaveRoom}
        aria-label="Leave room"
        title="Leave room"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </Button>
      
      {/* Device settings dropdown */}
      {showDeviceSettings && (
        <div className="absolute bottom-20 bg-gray-800 p-4 rounded-lg shadow-lg w-72 space-y-4">
          <h3 className="text-white font-medium mb-2">Device Settings</h3>
          
          {/* Audio input devices */}
          <div>
            <label htmlFor="audioDevice" className="block text-sm font-medium text-gray-300 mb-1">
              Microphone
            </label>
            <select
              id="audioDevice"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              value={selectedAudioDevice}
              onChange={(e) => changeAudioDevice(e.target.value)}
            >
              {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
          
          {/* Video input devices */}
          <div>
            <label htmlFor="videoDevice" className="block text-sm font-medium text-gray-300 mb-1">
              Camera
            </label>
            <select
              id="videoDevice"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              value={selectedVideoDevice}
              onChange={(e) => changeVideoDevice(e.target.value)}
            >
              {videoDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDeviceSettings(false)}
            className="w-full mt-2"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
};

export default MediaControls; 