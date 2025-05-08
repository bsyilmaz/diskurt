# Diskurt - Real-time Communication Platform

Diskurt is a web application for real-time communication with voice, video, screen sharing, and text chat capabilities. It's designed to be a lightweight alternative to platforms like Discord, Microsoft Teams, or Skype.

## Features

- **Room-based Communication**: Create or join rooms with password protection
- **Real-time Voice & Video**: WebRTC-powered audio/video communication
- **Screen Sharing**: Share your screen with other participants
- **Text Chat**: Send and receive messages with emoji support
- **User Management**: See participants and their status in the room
- **Device Settings**: Choose different microphones and cameras
- **No Registration Required**: Just enter a room name, password, and username
- **Responsive Design**: Works on both desktop and mobile devices

## Technologies Used

### Backend
- Node.js & Express
- Socket.IO for real-time communication
- WebRTC signaling

### Frontend
- React
- TailwindCSS for styling
- Simple-peer for WebRTC connections
- Socket.IO client

## Getting Started

### Prerequisites
- Node.js 14+ and npm

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/diskurt.git
cd diskurt
```

2. Install dependencies for both server and client
```
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
NODE_ENV=development
```

### Running the Application

#### Development Mode
1. Start the server
```
npm run server
```

2. In a separate terminal, start the client
```
cd client
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

#### Production Mode
1. Build the client
```
cd client
npm run build
cd ..
```

2. Start the server in production mode
```
NODE_ENV=production npm start
```

3. Open your browser and navigate to `http://localhost:5000`

## Deployment to Render.com

Diskurt includes a `render.yaml` file for easy deployment to Render.com:

1. Create a Render.com account at https://render.com/

2. Connect your GitHub repository to Render.com

3. Click "New Web Service" and select your repository

4. Choose "Blueprint" as the deployment method (this will use the render.yaml file)

5. Click "Create Blueprint"

Render.com will automatically build and deploy your application. Once deployed, you can access it at the URL provided by Render.

Alternatively, you can deploy manually:

1. Click "New Web Service" on your Render.com dashboard

2. Connect your repository

3. Use the following settings:
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Add environment variables: `NODE_ENV` = `production`

4. Click "Create Web Service"

## Usage

1. **Creating a Room**:
   - Enter a room name, password, and your username
   - Click "Join Room"
   - If the room doesn't exist, it will be created

2. **Joining a Room**:
   - Enter the existing room name, the correct password, and your username
   - Click "Join Room"

3. **Using the Communication Features**:
   - Use the media controls at the bottom to toggle your microphone, camera, and screen sharing
   - Use the chat panel to send and receive messages
   - View participants in the user list

## Room Behavior

- Rooms can have up to 10 participants
- Rooms require a password to join
- Empty rooms are automatically deleted after 5 minutes of inactivity

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by Discord, Microsoft Teams, and other communication platforms
- Built with open-source technologies 