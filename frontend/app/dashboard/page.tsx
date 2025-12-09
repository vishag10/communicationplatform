'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<any[]>([]);
  const [followRequests, setFollowRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadMutualFollowers();
    loadFollowRequests();
    
    const socket = getSocket();
    if (socket) {
      socket.on('follow-request-received', (data) => {
        setFollowRequests((prev) => [data.request, ...prev]);
      });
    }
    
    return () => {
      socket?.off('follow-request-received');
    };
  }, [user]);

  const loadMutualFollowers = async () => {
    try {
      const { data } = await api.get('/api/follow/mutual');
      setMutualFollowers(data.users);
    } catch (error) {
      console.error('Error loading mutual followers:', error);
    }
  };

  const loadFollowRequests = async () => {
    try {
      const { data } = await api.get('/api/follow/requests');
      setFollowRequests(data.requests);
    } catch (error) {
      console.error('Error loading follow requests:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const { data } = await api.get(`/api/follow/search?query=${searchQuery}`);
      setSearchResults(data.users);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await api.post(`/api/follow/request/${userId}`);
      alert('Follow request sent');
      setSearchResults(searchResults.filter(u => u._id !== userId));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send follow request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await api.post(`/api/follow/accept/${requestId}`);
      loadFollowRequests();
      loadMutualFollowers();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Communication Platform</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {user.username}</span>
            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Search Users</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by username or email"
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button onClick={handleSearch} className="bg-blue-500 text-white px-6 py-2 rounded-lg">
                Search
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {searchResults.map((user) => (
                <div key={user._id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-semibold">{user.username}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleFollow(user._id)}
                    className="bg-blue-500 text-white px-4 py-1 rounded"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Mutual Followers (Chat Available)</h2>
            <div className="space-y-2">
              {mutualFollowers.map((follower) => (
                <div key={follower._id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-semibold">{follower.username}</p>
                    <p className="text-sm text-gray-600">
                      {follower.isOnline ? '🟢 Online' : '⚫ Offline'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/chat?userId=${follower._id}`}
                      className="bg-green-500 text-white px-4 py-1 rounded"
                    >
                      Chat
                    </Link>
                    <Link
                      href={`/video-call?userId=${follower._id}`}
                      className="bg-purple-500 text-white px-4 py-1 rounded"
                    >
                      Call
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Follow Requests</h2>
            <div className="space-y-2">
              {followRequests.map((request) => (
                <div key={request._id} className="p-3 border rounded">
                  <p className="font-semibold">{request.from.username}</p>
                  <p className="text-sm text-gray-600 mb-2">{request.from.email}</p>
                  <button
                    onClick={() => handleAcceptRequest(request._id)}
                    className="w-full bg-blue-500 text-white px-4 py-1 rounded"
                  >
                    Accept
                  </button>
                </div>
              ))}
              {followRequests.length === 0 && (
                <p className="text-gray-500 text-center">No pending requests</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
