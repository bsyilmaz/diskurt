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
    const toggleUsersButton = document.getElementById('toggle-users-button');
    const onlineUsersPanel = document.getElementById('online-users');

    // Socket.io connection
    let socket;
    
    // Toggle users panel
    toggleUsersButton.addEventListener('click', () => {
        const mainContent = document.getElementById('main-content');
        
        if (onlineUsersPanel.style.display === 'none') {
            onlineUsersPanel.style.display = 'block';
            toggleUsersButton.innerHTML = '<i class="fas fa-users"></i>';
            toggleUsersButton.classList.add('active');
        } else {
            onlineUsersPanel.style.display = 'none';
            toggleUsersButton.innerHTML = '<i class="fas fa-users"></i>';
            toggleUsersButton.classList.remove('active');
        }
    });
    
    // Initialize panel state
    onlineUsersPanel.style.display = 'block';

    // WebRTC variables
    let localStream;
    let localVideoStream;
    let screenStream;
    const peers = {};
    const peerConnections = {};
    const mediaConstraints = {
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
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

    // ICE servers config for WebRTC - improved with more STUN/TURN servers
    const iceConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // Fallback public TURN servers (limited usage)
            {
                urls: 'turn:numb.viagenie.ca',
                credential: 'muazkh',
                username: 'webrtc@live.com'
            },
            {
                urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
                credential: 'webrtc',
                username: 'webrtc'
            }
        ],
        iceCandidatePoolSize: 10
    };

    // Check if we're on HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        addSystemMessage('Warning: WebRTC requires HTTPS for production use. Video/audio may not work.');
    }

    // Initialize login process
    loginButton.addEventListener('click', () => {
        const username = usernameInput.value.trim() || 'User-' + Math.floor(Math.random() * 1000);
        const room = roomNameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!room || !password) {
            alert('Please enter a room name and password.');
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
        socket.emit('join-room', currentRoom, currentUser);
        chatRoomName.textContent = `Room: ${currentRoom}`;

        // Set up socket event handlers
        setupSocketListeners();
        
        // Load previous messages
        loadMessages();
        
        // Display chat UI
        loginContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
        messageInput.focus();
        
        // Show welcome message
        addSystemMessage(`Welcome to ${currentRoom}! You are logged in as ${currentUser}.`);
    }

    // Set up Socket.io event listeners
    function setupSocketListeners() {
        socket.on('user-joined', (userData) => {
            console.log(`User joined:`, userData);
            
            // Add user to the list with their username
            addUserToList(userData.id, userData.username);
            
            // Display system message
            addSystemMessage(`${userData.username} joined the room.`);
            
            // If we have a media stream, send an offer to the new user
            if (localStream || localVideoStream) {
                createPeerConnection(userData.id);
            }
        });

        socket.on('user-ready', (userId) => {
            console.log(`User ready for connection: ${userId}`);
            if (!peerConnections[userId] && (localStream || localVideoStream)) {
                createPeerConnection(userId);
            }
        });
        
        socket.on('user-disconnected', (userId) => {
            const username = peers[userId] || userId;
            console.log(`User disconnected: ${userId} (${username})`);
            
            // Display system message
            addSystemMessage(`${username} left the room.`);
            
            // Remove from UI and connections
            removeUserFromList(userId);
            closePeerConnection(userId);
        });
        
        socket.on('new-message', (message) => {
            addMessageToUI(message);
        });
        
        // WebRTC signaling
        socket.on('offer', async (offer, fromUserId) => {
            console.log(`Received offer from ${fromUserId}`);
            try {
                if (!peerConnections[fromUserId]) {
                    createPeerConnection(fromUserId);
                }
                const pc = peerConnections[fromUserId];
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('answer', answer, fromUserId);
            } catch (error) {
                console.error('Error handling offer:', error);
            }
        });
        
        socket.on('answer', async (answer, fromUserId) => {
            console.log(`Received answer from ${fromUserId}`);
            try {
                const pc = peerConnections[fromUserId];
                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                }
            } catch (error) {
                console.error('Error handling answer:', error);
            }
        });
        
        socket.on('ice-candidate', async (candidate, fromUserId) => {
            console.log(`Received ICE candidate from ${fromUserId}`);
            try {
                const pc = peerConnections[fromUserId];
                if (pc) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (error) {
                console.error('Error adding received ice candidate:', error);
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

    // Create a WebRTC peer connection to another user - improved connection handling
    function createPeerConnection(userId) {
        if (peerConnections[userId]) return;
        
        console.log(`Creating peer connection to ${userId}`);
        const pc = new RTCPeerConnection(iceConfig);
        peerConnections[userId] = pc;
        
        // Add our media tracks to the connection with more reliable method
        let localTracks = [];
        
        if (localStream) {
            localStream.getTracks().forEach(track => {
                const sender = pc.addTrack(track, localStream);
                localTracks.push(sender);
            });
        }
        
        if (localVideoStream) {
            localVideoStream.getTracks().forEach(track => {
                const sender = pc.addTrack(track, localVideoStream);
                localTracks.push(sender);
            });
        }
        
        if (screenStream) {
            screenStream.getTracks().forEach(track => {
                const sender = pc.addTrack(track, screenStream);
                localTracks.push(sender);
            });
        }
        
        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate, userId);
                console.log('Sending ICE candidate to', userId);
            }
        };
        
        // Connection state logging
        pc.oniceconnectionstatechange = () => {
            console.log(`ICE connection state with ${userId}: ${pc.iceConnectionState}`);
            
            // If connection fails, try to restart ICE
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                console.log('Connection failed, attempting to restart ICE');
                pc.restartIce();
            }
        };
        
        // Handle incoming media streams with improved handling
        pc.ontrack = (event) => {
            console.log(`Received track from ${userId}`);
            
            if (event.streams && event.streams[0]) {
                const streamId = event.streams[0].id;
                console.log(`Stream ID: ${streamId}`);
                
                // Wait a moment to ensure stream is fully setup
                setTimeout(() => {
                    addVideoStream(userId, event.streams[0]);
                }, 200);
            }
        };
        
        // Create and send offer if this is the initiator
        if (localTracks.length > 0) {
            console.log('Creating offer for', userId);
            pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            })
            .then(offer => {
                return pc.setLocalDescription(offer);
            })
            .then(() => {
                console.log('Sending offer to', userId);
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
        const videoContainer = document.getElementById(`video-${userId}`);
        if (videoContainer) {
            videoContainer.remove();
        }
    }

    // Add a video stream to the UI - improved with fullscreen support
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
            
            // Set up controls
            const muteButton = videoContainer.querySelector('.mute-button');
            muteButton.addEventListener('click', () => {
                videoEl.muted = !videoEl.muted;
                muteButton.innerHTML = videoEl.muted ? 
                    '<i class="fas fa-volume-mute"></i>' : 
                    '<i class="fas fa-volume-up"></i>';
            });
            
            // Add fullscreen button (already in template)
            const fullscreenButton = videoContainer.querySelector('.fullscreen-button');
            fullscreenButton.addEventListener('click', () => toggleFullscreen(videoEl));
            
            videoGrid.appendChild(videoContainer);
        }
        
        const videoEl = videoContainer.querySelector('.user-video');
        
        // Handle stream replacement if already exists
        if (videoEl.srcObject && videoEl.srcObject.id !== stream.id) {
            console.log(`Replacing stream for user ${userId}`);
        }
        
        videoEl.srcObject = stream;
        
        // Set video properties
        videoEl.playsInline = true;
        videoEl.autoplay = true;
        
        // Handle play errors
        videoEl.play().catch(error => {
            console.error('Error playing video:', error);
            // Try again with user interaction
            videoEl.addEventListener('click', () => {
                videoEl.play();
            });
        });
        
        // Double-click for fullscreen
        videoEl.addEventListener('dblclick', () => {
            toggleFullscreen(videoEl);
        });
    }

    // Toggle fullscreen function
    function toggleFullscreen(element) {
        if (!document.fullscreenElement) {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) { /* Safari */
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) { /* IE11 */
                element.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE11 */
                document.msExitFullscreen();
            }
        }
    }

    // Add a message to the UI
    function addMessageToUI(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        if (message.sender === currentUser) {
            messageElement.classList.add('sent');
        }
        
        if (message.sender === 'System') {
            messageElement.classList.add('system');
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
            
            // Handle special styling for current user
            if (userId === socket.id) {
                nameSpan.textContent = `${name} (You)`;
                nameSpan.style.fontWeight = 'bold';
            }
            
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
            // Animate removal
            userItem.style.opacity = '0';
            userItem.style.height = '0';
            
            // Remove after animation
            setTimeout(() => {
                userItem.remove();
            }, 300);
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
                    if (userId !== socket.id) { // Don't create connection to self
                        if (!peerConnections[userId]) {
                            createPeerConnection(userId);
                        } else {
                            // If connection exists, add tracks
                            localStream.getTracks().forEach(track => {
                                peerConnections[userId].addTrack(track, localStream);
                            });
                        }
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
                    if (userId !== socket.id) { // Don't create connection to self
                        if (!peerConnections[userId]) {
                            createPeerConnection(userId);
                        } else {
                            // If connection exists, add tracks
                            localVideoStream.getTracks().forEach(track => {
                                peerConnections[userId].addTrack(track, localVideoStream);
                            });
                        }
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
            
            // Remove screen video display
            const screenContainer = document.getElementById('video-screen-local');
            if (screenContainer) {
                screenContainer.remove();
            }
            
            isScreenSharing = false;
            shareScreenButton.classList.remove('active');
            addSystemMessage('Screen sharing stopped');
        } else {
            // Start screen sharing
            try {
                screenStream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: {
                        cursor: "always",
                        displaySurface: "monitor"
                    },
                    audio: false
                });
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
                    if (userId !== socket.id) { // Don't create connection to self
                        if (!peerConnections[userId]) {
                            createPeerConnection(userId);
                        } else {
                            // If connection exists, add tracks
                            screenStream.getTracks().forEach(track => {
                                peerConnections[userId].addTrack(track, screenStream);
                            });
                        }
                    }
                });
            } catch (error) {
                console.error('Error sharing screen:', error);
                addSystemMessage(`Screen sharing error: ${error.message}`);
            }
        }
    });
    
    // Update CSS for system messages
    const style = document.createElement('style');
    style.textContent = `
        .message.system {
            background-color: rgba(88, 101, 242, 0.1);
            border-left: 3px solid var(--discord-primary);
            padding-left: 12px;
            max-width: 100%;
            margin-bottom: 10px;
        }
        .message.system .sender {
            color: var(--discord-primary);
        }
    `;
    document.head.appendChild(style);
}); 