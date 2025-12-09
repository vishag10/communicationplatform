'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user || !userId) {
      router.push('/dashboard');
      return;
    }

    loadMessages();
    loadUserInfo();
    setupSocketListeners();

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('message-sent');
        socket.off('receive-message');
        socket.off('user-typing');
        socket.off('user-stopped-typing');
      }
    };
  }, [user, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data } = await api.get(`/api/chat/messages/${userId}`);
      setMessages(data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadUserInfo = async () => {
    try {
      const { data } = await api.get('/api/follow/mutual');
      const targetUser = data.users.find((u: any) => u._id === userId);
      setOtherUser(targetUser);
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('message-sent', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('receive-message', (message) => {
      if (message.sender._id === userId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('user-typing', (data) => {
      if (data.userId === userId) {
        setIsTyping(true);
      }
    });

    socket.on('user-stopped-typing', (data) => {
      if (data.userId === userId) {
        setIsTyping(false);
      }
    });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('send-message', {
        receiverId: userId,
        content: newMessage
      });
      setNewMessage('');
      socket.emit('typing-stop', { receiverId: userId });
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    const socket = getSocket();
    if (!socket) return;

    socket.emit('typing-start', { receiverId: userId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', { receiverId: userId });
    }, 1000);
  };

  if (!user || !otherUser) return null;

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
            {otherUser.profilePicture ? (
              <img src={otherUser.profilePicture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                {otherUser.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <h2 className="font-semibold text-lg text-gray-900">{otherUser.username}</h2>
        </div>
        <div className="flex gap-4">
          <button onClick={() => router.push(`/video-call?userId=${userId}`)} className="text-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="text-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`flex items-end gap-2 ${msg.sender._id === user.id ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender._id !== user.id && (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                {otherUser.profilePicture ? (
                  <img src={otherUser.profilePicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                    {otherUser.username[0].toUpperCase()}
                  </div>
                )}
              </div>
            )}
            <div
              className={`max-w-xs px-4 py-3 rounded-2xl ${
                msg.sender._id === user.id
                  ? 'bg-purple-600 text-white rounded-br-sm'
                  : 'bg-gray-200 text-gray-900 rounded-bl-sm'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
            <div className="bg-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm">
              <p className="text-sm text-gray-600">Typing...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t p-4">
        <div className="flex items-center gap-2">
          <button className="text-gray-500 p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Write a message..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none text-sm"
          />
          <button className="text-gray-500 p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button
            onClick={handleSendMessage}
            className="bg-purple-600 text-white p-3 rounded-2xl hover:bg-purple-700"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
