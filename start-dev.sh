#!/bin/bash

echo "Starting Diskurt in development mode..."
echo "This will start both the server and client concurrently."
echo

# Check if dependencies are installed
if [ ! -d "node_modules" ] || [ ! -d "client/node_modules" ]; then
  echo "Dependencies are not installed. Installing now..."
  npm run install:all
fi

# Start the application in development mode
npm run dev