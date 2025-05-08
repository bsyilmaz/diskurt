import React from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import Login from './pages/Login';
import Room from './pages/Room';

// Main App wrapper that provides Socket context
const App = () => {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
};

// App content that consumes Socket context
const AppContent = () => {
  const { roomId } = useSocket();
  
  return (
    <div className="App">
      {roomId ? <Room /> : <Login />}
    </div>
  );
};

export default App; 