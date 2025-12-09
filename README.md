# Full-Stack Communication Platform

A production-grade communication platform built with Next.js and Node.js/Express featuring secure authentication, real-time chat, follow system, and video calling.

## Features

### Authentication & Authorization
- JWT-based authentication with access and refresh tokens
- Secure password hashing with bcrypt
- Token refresh mechanism for seamless user experience
- Protected routes with middleware verification

### Follow System
- User search functionality
- Send/accept follow requests
- Mutual follow requirement for communication
- Privacy-controlled interactions

### Real-Time Chat
- WebSocket-based messaging using Socket.IO
- Instant message delivery
- Typing indicators
- Online/offline presence tracking
- Message history with pagination
- Read receipts

### Video Calling
- WebRTC peer-to-peer video calls
- Socket.IO signaling server
- Camera and microphone controls
- Mute/unmute audio
- Enable/disable video
- Call status indicators
- Connection management

## Tech Stack

### Backend
- Node.js & Express
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT for authentication
- bcryptjs for password hashing

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Socket.IO Client
- Axios for API calls
- WebRTC for video calling

## Project Structure

```
communicationplatform/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── followController.js
│   │   └── chatController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Message.js
│   │   └── FollowRequest.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── followRoutes.js
│   │   └── chatRoutes.js
│   ├── socket/
│   │   └── socketHandler.js
│   ├── utils/
│   │   └── tokenUtils.js
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── app/
│   │   ├── chat/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── video-call/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── socket.ts
│   ├── .env.local
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/communication-platform
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_REFRESH_SECRET=your_refresh_secret_key_here_change_in_production
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

4. Start the server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## API Documentation

### Authentication Endpoints

#### Register User
```
POST /api/auth/register
Body: {
  username: string,
  email: string,
  password: string,
  bio?: string,
  profilePicture?: string
}
Response: { user, accessToken, refreshToken }
```

#### Login
```
POST /api/auth/login
Body: { email: string, password: string }
Response: { user, accessToken, refreshToken }
```

#### Refresh Token
```
POST /api/auth/refresh-token
Body: { refreshToken: string }
Response: { accessToken, refreshToken }
```

#### Logout
```
POST /api/auth/logout
Headers: { Authorization: Bearer <token> }
Response: { message }
```

#### Get Profile
```
GET /api/auth/profile
Headers: { Authorization: Bearer <token> }
Response: { user }
```

### Follow System Endpoints

#### Search Users
```
GET /api/follow/search?query=<search_term>
Headers: { Authorization: Bearer <token> }
Response: { users: [] }
```

#### Send Follow Request
```
POST /api/follow/request/:userId
Headers: { Authorization: Bearer <token> }
Response: { message, followRequest }
```

#### Accept Follow Request
```
POST /api/follow/accept/:requestId
Headers: { Authorization: Bearer <token> }
Response: { message }
```

#### Get Follow Requests
```
GET /api/follow/requests
Headers: { Authorization: Bearer <token> }
Response: { requests: [] }
```

#### Get Mutual Followers
```
GET /api/follow/mutual
Headers: { Authorization: Bearer <token> }
Response: { users: [] }
```

#### Unfollow User
```
DELETE /api/follow/unfollow/:userId
Headers: { Authorization: Bearer <token> }
Response: { message }
```

### Chat Endpoints

#### Get Messages
```
GET /api/chat/messages/:userId?page=1&limit=50
Headers: { Authorization: Bearer <token> }
Response: { messages: [] }
```

#### Mark Messages as Read
```
POST /api/chat/mark-read
Headers: { Authorization: Bearer <token> }
Body: { messageIds: [] }
Response: { message }
```

#### Get Chat List
```
GET /api/chat/list
Headers: { Authorization: Bearer <token> }
Response: { chatList: [] }
```

## Socket.IO Events

### Client to Server

- `send-message`: Send a message
  ```js
  { receiverId: string, content: string }
  ```

- `typing-start`: Notify typing started
  ```js
  { receiverId: string }
  ```

- `typing-stop`: Notify typing stopped
  ```js
  { receiverId: string }
  ```

- `call-user`: Initiate video call
  ```js
  { to: string, offer: RTCSessionDescription, callType: string }
  ```

- `call-answer`: Answer incoming call
  ```js
  { to: string, answer: RTCSessionDescription }
  ```

- `ice-candidate`: Exchange ICE candidates
  ```js
  { to: string, candidate: RTCIceCandidate }
  ```

- `call-reject`: Reject incoming call
  ```js
  { to: string }
  ```

- `call-end`: End active call
  ```js
  { to: string }
  ```

### Server to Client

- `user-online`: User came online
  ```js
  { userId: string }
  ```

- `user-offline`: User went offline
  ```js
  { userId: string, lastSeen: Date }
  ```

- `receive-message`: New message received
  ```js
  { message: Message }
  ```

- `message-sent`: Message sent confirmation
  ```js
  { message: Message }
  ```

- `user-typing`: User is typing
  ```js
  { userId: string }
  ```

- `user-stopped-typing`: User stopped typing
  ```js
  { userId: string }
  ```

- `incoming-call`: Incoming call notification
  ```js
  { from: string, offer: RTCSessionDescription, callType: string, caller: User }
  ```

- `call-answered`: Call was answered
  ```js
  { from: string, answer: RTCSessionDescription }
  ```

- `call-rejected`: Call was rejected
  ```js
  { from: string }
  ```

- `call-ended`: Call ended
  ```js
  { from: string }
  ```

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT access tokens (15 minutes expiry)
- JWT refresh tokens (7 days expiry)
- Protected API routes with authentication middleware
- Mutual follow requirement for communication
- CORS configuration
- Input validation
- Secure WebSocket authentication

## Architecture Principles

- Clean separation of concerns
- Modular folder structure
- Reusable components
- Environment-based configuration
- Proper error handling
- Scalable real-time architecture
- Type-safe frontend with TypeScript

## Production Considerations

1. **Environment Variables**: Update all secrets in production
2. **Database**: Use MongoDB Atlas or managed database
3. **HTTPS**: Enable SSL/TLS certificates
4. **TURN Server**: Add TURN server for WebRTC NAT traversal
5. **Rate Limiting**: Implement API rate limiting
6. **Logging**: Add comprehensive logging
7. **Monitoring**: Set up application monitoring
8. **CDN**: Use CDN for static assets
9. **Load Balancing**: Implement load balancing for scalability
10. **WebSocket Scaling**: Use Redis adapter for Socket.IO clustering

## License

MIT
