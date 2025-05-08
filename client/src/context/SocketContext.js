import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [stream, setStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [messages, setMessages] = useState([]);
  
  // Refs for peer connections
  const peersRef = useRef({});
  const userVideoRef = useRef(null);
  const screenVideoRef = useRef(null);

  // Initialize socket
  useEffect(() => {
    // In development, connect to the local server
    // In production, it will connect to the same origin
    const newSocket = io(
      process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:5000'
    );
    
    setSocket(newSocket);

    // Clean up socket on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Handle successful room join
    socket.on('room-joined', ({ roomId, users }) => {
      setRoomId(roomId);
      setUsers(users);
      setError('');

      // Create peer connections with existing users
      users.forEach(user => {
        if (user.id !== socket.id && stream) {
          const peer = createPeer(user.id, socket.id, stream);
          peersRef.current[user.id] = peer;
        }
      });
    });

    // Handle room join errors
    socket.on('room-error', ({ message }) => {
      setError(message);
    });

    // Handle new user joining
    socket.on('user-joined', ({ user, users }) => {
      setUsers(users);
      
      // Create a peer connection for the new user
      if (user.id !== socket.id && stream) {
        const peer = createPeer(user.id, socket.id, stream);
        peersRef.current[user.id] = peer;
      }
    });

    // Handle user updates (mute, video, etc.)
    socket.on('user-updated', ({ user, users }) => {
      setUsers(users);
    });

    // Handle user leaving
    socket.on('user-left', ({ userId, users }) => {
      setUsers(users);
      
      // Clean up peer connection
      if (peersRef.current[userId]) {
        peersRef.current[userId].destroy();
        delete peersRef.current[userId];
      }
    });

    // Handle chat history when joining a room
    socket.on('chat-history', (chatHistory) => {
      setMessages(chatHistory);
    });

    // Handle new chat messages
    socket.on('chat-message', (message) => {
      setMessages(prevMessages => [...prevMessages, message]);
    });

    // Handle WebRTC signaling
    socket.on('signal', ({ userId, signal }) => {
      // If we're receiving a signal from an unknown peer, create one
      if (!peersRef.current[userId] && stream) {
        const peer = addPeer(userId, signal, stream);
        peersRef.current[userId] = peer;
      } else if (peersRef.current[userId]) {
        // Otherwise, process the signal with the existing peer
        peersRef.current[userId].signal(signal);
      }
    });

    return () => {
      socket.off('room-joined');
      socket.off('room-error');
      socket.off('user-joined');
      socket.off('user-updated');
      socket.off('user-left');
      socket.off('chat-history');
      socket.off('chat-message');
      socket.off('signal');
    };
  }, [socket, stream]);

  // Initialize media devices
  useEffect(() => {
    // Get available media devices
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        
        setAudioDevices(audioInputs);
        setVideoDevices(videoInputs);
        
        // Set defaults
        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
        
        if (videoInputs.length > 0) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
      })
      .catch(err => {
        console.error('Error getting media devices:', err);
      });
  }, []);

  // Create a peer connection as the initiator
  const createPeer = (targetId, callerId, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream
    });

    peer.on('signal', signal => {
      socket.emit('signal', { userId: targetId, signal });
    });

    return peer;
  };

  // Add a peer connection as the receiver
  const addPeer = (callerId, incomingSignal, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream
    });

    peer.on('signal', signal => {
      socket.emit('signal', { userId: callerId, signal });
    });

    peer.signal(incomingSignal);

    return peer;
  };

  // Join a room
  const joinRoom = async (roomData) => {
    try {
      const { roomId, username, password } = roomData;
      
      // Get media stream based on selected devices
      const constraints = {
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
        video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      setUsername(username);
      setIsVideoOn(true);
      
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = mediaStream;
      }
      
      // Join room via socket
      socket.emit('join-room', { roomId, username, password });
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Failed to access media devices. Please check your permissions.');
    }
  };

  // Send a chat message
  const sendMessage = (content, type = 'text') => {
    if (!socket || !roomId || !content.trim()) return;
    
    socket.emit('send-message', {
      roomId,
      content,
      type
    });
  };

  // Toggle mute status
  const toggleMute = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      
      setIsMuted(!isMuted);
      
      // Update status in room
      socket.emit('media-status', {
        roomId,
        status: { isMuted: !isMuted }
      });
    }
  };

  // Toggle video status
  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      
      setIsVideoOn(!isVideoOn);
      
      // Update status in room
      socket.emit('media-status', {
        roomId,
        status: { isVideoOn: !isVideoOn }
      });
    }
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      
      setScreenStream(null);
      setIsScreenSharing(false);
      
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
    } else {
      try {
        // Start screen sharing
        const displayMediaOptions = {
          video: {
            cursor: "always"
          },
          audio: true
        };
        
        const mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        
        setScreenStream(mediaStream);
        setIsScreenSharing(true);
        
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = mediaStream;
        }
        
        // Add event listener for when user stops sharing screen
        mediaStream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
          
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
          }
          
          // Update status in room
          socket.emit('media-status', {
            roomId,
            status: { isScreenSharing: false }
          });
        };
      } catch (err) {
        console.error('Error sharing screen:', err);
        setError('Failed to share screen. Please check your permissions.');
      }
    }
    
    // Update status in room
    socket.emit('media-status', {
      roomId,
      status: { isScreenSharing: !isScreenSharing }
    });
  };

  // Change audio device
  const changeAudioDevice = async (deviceId) => {
    try {
      setSelectedAudioDevice(deviceId);
      
      if (stream) {
        // Stop current tracks
        stream.getAudioTracks().forEach(track => track.stop());
        
        // Get new media stream with selected device
        const constraints = {
          audio: { deviceId: { exact: deviceId } },
          video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true
        };
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Replace audio track in existing stream
        const audioTrack = mediaStream.getAudioTracks()[0];
        
        // Remove old audio tracks
        const oldAudioTracks = stream.getAudioTracks();
        oldAudioTracks.forEach(track => {
          stream.removeTrack(track);
        });
        
        // Add new audio track
        stream.addTrack(audioTrack);
        
        // Update the stream for all peers
        Object.values(peersRef.current).forEach(peer => {
          peer.replaceTrack(
            oldAudioTracks[0],
            audioTrack,
            stream
          );
        });
      }
    } catch (err) {
      console.error('Error changing audio device:', err);
    }
  };

  // Change video device
  const changeVideoDevice = async (deviceId) => {
    try {
      setSelectedVideoDevice(deviceId);
      
      if (stream) {
        // Stop current tracks
        stream.getVideoTracks().forEach(track => track.stop());
        
        // Get new media stream with selected device
        const constraints = {
          audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
          video: { deviceId: { exact: deviceId } }
        };
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Replace video track in existing stream
        const videoTrack = mediaStream.getVideoTracks()[0];
        
        // Remove old video tracks
        const oldVideoTracks = stream.getVideoTracks();
        oldVideoTracks.forEach(track => {
          stream.removeTrack(track);
        });
        
        // Add new video track
        stream.addTrack(videoTrack);
        
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
        
        // Update the stream for all peers
        Object.values(peersRef.current).forEach(peer => {
          peer.replaceTrack(
            oldVideoTracks[0],
            videoTrack,
            stream
          );
        });
      }
    } catch (err) {
      console.error('Error changing video device:', err);
    }
  };

  // Leave room
  const leaveRoom = () => {
    // Stop all media streams
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up peer connections
    Object.values(peersRef.current).forEach(peer => peer.destroy());
    peersRef.current = {};
    
    // Reset state
    setRoomId('');
    setUsername('');
    setUsers([]);
    setStream(null);
    setScreenStream(null);
    setIsMuted(false);
    setIsVideoOn(false);
    setIsScreenSharing(false);
    setMessages([]);
    
    // Disconnect socket and reconnect
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        roomId,
        username,
        users,
        error,
        stream,
        screenStream,
        isMuted,
        isVideoOn,
        isScreenSharing,
        messages,
        joinRoom,
        leaveRoom,
        sendMessage,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        userVideoRef,
        screenVideoRef,
        peersRef,
        audioDevices,
        videoDevices,
        selectedAudioDevice,
        selectedVideoDevice,
        changeAudioDevice,
        changeVideoDevice
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext; 