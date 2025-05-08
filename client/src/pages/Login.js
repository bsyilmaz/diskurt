import React, { useState } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import { useSocket } from '../context/SocketContext';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    roomId: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  
  const { error, joinRoom } = useSocket();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific error when typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Form validation
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.roomId.trim()) {
      newErrors.roomId = 'Room name is required';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Join the room
    joinRoom(formData);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Diskurt</h1>
          <p className="mt-2 text-sm text-gray-600">
            Join or create a room to start communicating
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm bg-white p-6 border border-gray-200">
            <Input
              id="username"
              name="username"
              label="Username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your display name"
              required
              error={errors.username}
            />
            
            <Input
              id="roomId"
              name="roomId"
              label="Room Name"
              value={formData.roomId}
              onChange={handleChange}
              placeholder="Enter a room name to join or create"
              required
              error={errors.roomId}
            />
            
            <Input
              id="password"
              name="password"
              type="password"
              label="Room Password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter room password"
              required
              error={errors.password}
            />
            
            {error && (
              <div className="mt-2 p-2 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
          </div>
          
          <div>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
            >
              Join Room
            </Button>
          </div>
        </form>
        
        <div className="text-center text-sm text-gray-500">
          <p>© 2023 Diskurt. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login; 