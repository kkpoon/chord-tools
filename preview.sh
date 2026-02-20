#!/bin/bash
PORT=8000
echo "Starting a simple HTTP server on port $PORT"
python3 -m http.server $PORT &
SERVER_PID=$!

# Give the server a moment to start
sleep 1

IP_ADDRESS=$(hostname -I | awk '{print $1}')
if [ -z "$IP_ADDRESS" ]; then
  IP_ADDRESS="localhost"
fi

echo "Web server started. Please open http://$IP_ADDRESS:$PORT in your browser."

# Trap to kill the server on script exit
trap 'echo "Stopping server..."; kill $SERVER_PID' EXIT

# Wait for the server process to be manually stopped (e.g., with Ctrl+C)
wait $SERVER_PID
