document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginContainer = document.getElementById('login-container');
    const chatContainer = document.getElementById('chat-container');
    const usernameInput = document.getElementById('username');
    const roomNameInput = document.getElementById('room-name');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const chatRoomName = document.getElementById('chat-room-name');
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const speakButton = document.getElementById('speak-button');
    const videoButton = document.getElementById('video-button');
    const shareScreenButton = document.getElementById('share-screen-button');
    const usersList = document.getElementById('users-list');
    const videoGrid = document.getElementById('video-grid');
    const videoTemplate = document.getElementById('video-container-template');

    // Socket.io connection
    let socket;
    
    // WebRTC variables
    let localStream;
    let localVideoStream;
    let screenStream;
    const peers = {};
    const peerConnections = {};
    const mediaConstraints = {
        audio: {
            echoCancellation: true,
            noiseSuppression: true
        },
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
        }
    };

    // User variables
    let currentRoom = "";
    let currentUser = "";
    let isAudioEnabled = false;
    let isVideoEnabled = false;
    let isScreenSharing = false;

    // ICE servers config for WebRTC
    const iceConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    // Initialize login process
    loginButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const room = roomNameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !room || !password) {
            alert('Please enter your name, a room name, and a password.');
            return;
        }

        // Authenticate with server
        fetch('/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ roomName: room, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentUser = username;
                currentRoom = room;
                initializeChat();
            } else {
                alert(data.message || 'Invalid room or password');
            }
        })
        .catch(error => {
            console.error('Authentication error:', error);
            alert('Error connecting to server. Please try again.');
        });
    });

    // Initialize chat after successful login
    function initializeChat() {
        // Connect to Socket.io server
        socket = io();
        
        // Join the chat room
        socket.emit('join-room', currentRoom);
        chatRoomName.textContent = `Room: ${currentRoom}`;

        // Set up socket event handlers
        setupSocketListeners();
        
        // Load previous messages
        loadMessages();
        
        // Display chat UI
        loginContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
        messageInput.focus();
    }

    // Set up Socket.io event listeners
    function setupSocketListeners() {
        socket.on('user-joined', (userId) => {
            console.log(`User joined: ${userId}`);
            addUserToList(userId, 'Unknown User'); // We don't know their name yet
            
            // If we have a media stream, send an offer to the new user
            if (localStream || localVideoStream) {
                createPeerConnection(userId);
            }
        });

        socket.on('user-ready', (userId) => {
            console.log(`User ready for connection: ${userId}`);
            if (!peerConnections[userId] && (localStream || localVideoStream)) {
                createPeerConnection(userId);
            }
        });
        
        socket.on('user-disconnected', (userId) => {
            console.log(`User disconnected: ${userId}`);
            removeUserFromList(userId);
            closePeerConnection(userId);
        });
        
        socket.on('new-message', (message) => {
            addMessageToUI(message);
        });
        
        // WebRTC signaling
        socket.on('offer', async (offer, fromUserId) => {
            console.log(`Received offer from ${fromUserId}`);
            if (!peerConnections[fromUserId]) {
                createPeerConnection(fromUserId);
            }
            const pc = peerConnections[fromUserId];
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer', answer, fromUserId);
        });
        
        socket.on('answer', async (answer, fromUserId) => {
            console.log(`Received answer from ${fromUserId}`);
            const pc = peerConnections[fromUserId];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });
        
        socket.on('ice-candidate', async (candidate, fromUserId) => {
            console.log(`Received ICE candidate from ${fromUserId}`);
            const pc = peerConnections[fromUserId];
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });
    }

    // Load previous messages from server
    function loadMessages() {
        fetch(`/messages/${currentRoom}`)
            .then(response => response.json())
            .then(messages => {
                messages.forEach(message => {
                    addMessageToUI(message);
                });
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            })
            .catch(error => {
                console.error('Error loading messages:', error);
                addSystemMessage('Failed to load previous messages.');
            });
    }

    // Create a WebRTC peer connection to another user
    function createPeerConnection(userId) {
        if (peerConnections[userId]) return;
        
        console.log(`Creating peer connection to ${userId}`);
        const pc = new RTCPeerConnection(iceConfig);
        peerConnections[userId] = pc;
        
        // Add our media tracks to the connection
        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }
        
        if (localVideoStream) {
            localVideoStream.getTracks().forEach(track => {
                pc.addTrack(track, localVideoStream);
            });
        }
        
        if (screenStream) {
            screenStream.getTracks().forEach(track => {
                pc.addTrack(track, screenStream);
            });
        }
        
        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate, userId);
            }
        };
        
        // Handle incoming media streams
        pc.ontrack = (event) => {
            console.log(`Received track from ${userId}`);
            addVideoStream(userId, event.streams[0]);
        };
        
        // Create and send offer if this is the initiator
        if (localStream || localVideoStream || screenStream) {
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    socket.emit('offer', pc.localDescription, userId);
                })
                .catch(error => {
                    console.error('Error creating offer:', error);
                });
        }
        
        return pc;
    }

    // Close a peer connection when a user disconnects
    function closePeerConnection(userId) {
        if (peerConnections[userId]) {
            peerConnections[userId].close();
            delete peerConnections[userId];
        }
        
        // Remove any video elements
        const videoEl = document.getElementById(`video-${userId}`);
        if (videoEl) {
            videoEl.remove();
        }
    }

    // Add a video stream to the UI
    function addVideoStream(userId, stream) {
        // Check if video container already exists
        let videoContainer = document.getElementById(`video-${userId}`);
        
        if (!videoContainer) {
            // Clone the template and set up the new video container
            videoContainer = videoTemplate.cloneNode(true);
            videoContainer.id = `video-${userId}`;
            videoContainer.style.display = 'block';
            
            const videoEl = videoContainer.querySelector('.user-video');
            const nameEl = videoContainer.querySelector('.user-name');
            
            // Set user name
            nameEl.textContent = peers[userId] || userId;
            
            // Set up mute button
            const muteButton = videoContainer.querySelector('.mute-button');
            muteButton.addEventListener('click', () => {
                videoEl.muted = !videoEl.muted;
                muteButton.textContent = videoEl.muted ? '🔇' : '🔊';
            });
            
            videoGrid.appendChild(videoContainer);
        }
        
        const videoEl = videoContainer.querySelector('.user-video');
        videoEl.srcObject = stream;
        videoEl.play().catch(error => {
            console.error('Error playing video:', error);
        });
    }

    // Add a message to the UI
    function addMessageToUI(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        if (message.sender === currentUser) {
            messageElement.classList.add('sent');
        }
        
        const senderElement = document.createElement('div');
        senderElement.classList.add('sender');
        senderElement.textContent = message.sender;
        
        const textElement = document.createElement('div');
        textElement.classList.add('text');
        textElement.textContent = message.text;
        
        const timestampElement = document.createElement('div');
        timestampElement.classList.add('timestamp');
        const timestamp = message.timestamp ? new Date(message.timestamp) : new Date();
        timestampElement.textContent = timestamp.toLocaleTimeString();
        
        messageElement.appendChild(senderElement);
        messageElement.appendChild(textElement);
        messageElement.appendChild(timestampElement);
        
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to the latest message
    }

    // Add a system message
    function addSystemMessage(text) {
        const message = {
            sender: 'System',
            text: text,
            timestamp: new Date().toISOString()
        };
        addMessageToUI(message);
    }

    // Add a user to the online users list
    function addUserToList(userId, name) {
        // Store the user
        peers[userId] = name;
        
        // Update or create list item
        let userItem = document.getElementById(`user-${userId}`);
        if (!userItem) {
            userItem = document.createElement('li');
            userItem.id = `user-${userId}`;
            
            const statusDot = document.createElement('span');
            statusDot.classList.add('status');
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;
            
            userItem.appendChild(statusDot);
            userItem.appendChild(nameSpan);
            
            usersList.appendChild(userItem);
        }
    }

    // Remove a user from the online users list
    function removeUserFromList(userId) {
        delete peers[userId];
        const userItem = document.getElementById(`user-${userId}`);
        if (userItem) {
            userItem.remove();
        }
    }

    // Message sending
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const text = messageInput.value.trim();
        if (text === '') return;
        
        const message = {
            sender: currentUser,
            text: text
        };
        
        socket.emit('send-message', message);
        messageInput.value = '';
        messageInput.focus();
    }

    // Audio chat functionality
    speakButton.addEventListener('click', async () => {
        if (isAudioEnabled) {
            // Turn off audio
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }
            isAudioEnabled = false;
            speakButton.classList.remove('active');
            addSystemMessage('Voice chat disabled');
        } else {
            // Turn on audio
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: mediaConstraints.audio, video: false });
                isAudioEnabled = true;
                speakButton.classList.add('active');
                addSystemMessage('Voice chat enabled');
                
                // Notify other users we're ready to connect
                socket.emit('user-ready');
                
                // Create peer connections with existing users
                Object.keys(peers).forEach(userId => {
                    if (!peerConnections[userId]) {
                        createPeerConnection(userId);
                    } else {
                        // If connection exists, add tracks
                        localStream.getTracks().forEach(track => {
                            peerConnections[userId].addTrack(track, localStream);
                        });
                    }
                });
            } catch (error) {
                console.error('Error accessing microphone:', error);
                addSystemMessage(`Microphone access error: ${error.message}`);
            }
        }
    });

    // Video chat functionality
    videoButton.addEventListener('click', async () => {
        if (isVideoEnabled) {
            // Turn off video
            if (localVideoStream) {
                localVideoStream.getTracks().forEach(track => track.stop());
                localVideoStream = null;
            }
            
            // Remove local video display
            const localVideoContainer = document.getElementById('video-local');
            if (localVideoContainer) {
                localVideoContainer.remove();
            }
            
            isVideoEnabled = false;
            videoButton.classList.remove('active');
            addSystemMessage('Video chat disabled');
        } else {
            // Turn on video
            try {
                localVideoStream = await navigator.mediaDevices.getUserMedia({ video: mediaConstraints.video });
                isVideoEnabled = true;
                videoButton.classList.add('active');
                addSystemMessage('Video chat enabled');
                
                // Display local video
                const videoId = 'local';
                addVideoStream(videoId, localVideoStream);
                
                // Add user name to the video
                const videoContainer = document.getElementById(`video-${videoId}`);
                if (videoContainer) {
                    const nameEl = videoContainer.querySelector('.user-name');
                    nameEl.textContent = `${currentUser} (You)`;
                }
                
                // Notify other users we're ready to connect
                socket.emit('user-ready');
                
                // Create peer connections with existing users
                Object.keys(peers).forEach(userId => {
                    if (!peerConnections[userId]) {
                        createPeerConnection(userId);
                    } else {
                        // If connection exists, add tracks
                        localVideoStream.getTracks().forEach(track => {
                            peerConnections[userId].addTrack(track, localVideoStream);
                        });
                    }
                });
            } catch (error) {
                console.error('Error accessing camera:', error);
                addSystemMessage(`Camera access error: ${error.message}`);
            }
        }
    });

    // Screen sharing functionality
    shareScreenButton.addEventListener('click', async () => {
        if (isScreenSharing) {
            // Stop screen sharing
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
                screenStream = null;
            }
            
            isScreenSharing = false;
            shareScreenButton.classList.remove('active');
            addSystemMessage('Screen sharing stopped');
        } else {
            // Start screen sharing
            try {
                screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                isScreenSharing = true;
                shareScreenButton.classList.add('active');
                addSystemMessage('Screen sharing started');
                
                // Listen for the user stopping sharing via browser controls
                screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                    shareScreenButton.click(); // Simulate clicking the button to stop sharing
                });
                
                // Display local screen share
                const screenId = 'screen-local';
                addVideoStream(screenId, screenStream);
                
                // Add user name to the video
                const videoContainer = document.getElementById(`video-${screenId}`);
                if (videoContainer) {
                    const nameEl = videoContainer.querySelector('.user-name');
                    nameEl.textContent = `${currentUser}'s Screen`;
                }
                
                // Notify other users we're ready to connect
                socket.emit('user-ready');
                
                // Create peer connections with existing users
                Object.keys(peers).forEach(userId => {
                    if (!peerConnections[userId]) {
                        createPeerConnection(userId);
                    } else {
                        // If connection exists, add tracks
                        screenStream.getTracks().forEach(track => {
                            peerConnections[userId].addTrack(track, screenStream);
                        });
                    }
                });
            } catch (error) {
                console.error('Error sharing screen:', error);
                addSystemMessage(`Screen sharing error: ${error.message}`);
            }
        }
    });
}); 