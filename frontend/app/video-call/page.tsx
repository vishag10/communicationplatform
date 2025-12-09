'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/lib/socket';

export default function VideoCallPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!user || !userId) {
      router.push('/dashboard');
      return;
    }

    setupWebRTC();
    setupSocketListeners();

    return () => {
      cleanup();
    };
  }, [user, userId]);

  const setupWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const configuration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      };

      peerConnectionRef.current = new RTCPeerConnection(configuration);

      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream);
      });

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          const socket = getSocket();
          socket?.emit('ice-candidate', {
            to: userId,
            candidate: event.candidate
          });
        }
      };
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Failed to access camera/microphone');
    }
  };

  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('incoming-call', async ({ from, offer, caller }) => {
      if (!offer || !offer.type || !offer.sdp) {
        console.error('Invalid offer received');
        return;
      }
      
      setCallStatus('ringing');
      const accept = confirm(`Incoming call from ${caller.username}`);
      
      if (accept) {
        await handleAnswerCall(from, offer);
      } else {
        socket.emit('call-reject', { to: from });
        router.push('/dashboard');
      }
    });

    socket.on('call-answered', async ({ from, answer }) => {
      await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      setCallStatus('connected');
    });

    socket.on('ice-candidate', async ({ from, candidate }) => {
      await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('call-rejected', () => {
      alert('Call rejected');
      cleanup();
      router.push('/dashboard');
    });

    socket.on('call-ended', () => {
      setCallStatus('ended');
      cleanup();
      setTimeout(() => router.push('/dashboard'), 2000);
    });
  };

  const handleStartCall = async () => {
    setCallStatus('calling');
    const offer = await peerConnectionRef.current?.createOffer();
    await peerConnectionRef.current?.setLocalDescription(offer);

    const socket = getSocket();
    socket?.emit('call-user', {
      to: userId,
      offer,
      callType: 'video'
    });
  };

  const handleAnswerCall = async (from: string, offer: any) => {
    if (!offer || !offer.type || !offer.sdp) return;
    
    await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnectionRef.current?.createAnswer();
    await peerConnectionRef.current?.setLocalDescription(answer);

    const socket = getSocket();
    socket?.emit('call-answer', {
      to: from,
      answer
    });

    setCallStatus('connected');
  };

  const handleEndCall = () => {
    const socket = getSocket();
    socket?.emit('call-end', { to: userId });
    cleanup();
    router.push('/dashboard');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    peerConnectionRef.current?.close();
  };

  return (
    <div className="h-screen bg-black flex flex-col relative">
      <button
        onClick={() => router.push('/dashboard')}
        className="absolute top-6 left-6 z-50 text-white bg-black bg-opacity-30 p-2 rounded-full"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex-1 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-24 right-6 w-32 h-44 object-cover rounded-2xl border-2 border-white shadow-lg"
        />

        <div className="absolute top-6 right-6 flex flex-col gap-3">
          <button
            onClick={toggleMute}
            className="bg-white bg-opacity-30 backdrop-blur-sm text-white p-4 rounded-full hover:bg-opacity-40"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              {isMuted ? (
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              )}
            </svg>
          </button>

          <button
            onClick={toggleVideo}
            className="bg-white bg-opacity-30 backdrop-blur-sm text-white p-4 rounded-full hover:bg-opacity-40"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              {isVideoOff ? (
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0018 13.657V6.343a2 2 0 00-3.274-1.53l-1.46 1.095a4 4 0 00-5.532 0L3.707 2.293zM2 6a2 2 0 012-2h.5L2 6.5V6z" clipRule="evenodd" />
              ) : (
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              )}
            </svg>
          </button>
        </div>

        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 backdrop-blur-sm text-white px-6 py-3 rounded-full">
          <p className="text-lg font-medium">{Math.floor(Date.now() / 60000) % 60}:{(Date.now() / 1000 % 60).toFixed(0).padStart(2, '0')}</p>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-6">
        {callStatus === 'idle' && (
          <button
            onClick={handleStartCall}
            className="bg-green-500 text-white p-5 rounded-full hover:bg-green-600 shadow-lg"
          >
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </button>
        )}

        {(callStatus === 'calling' || callStatus === 'connected') && (
          <>
            <button
              onClick={toggleVideo}
              className="bg-gray-700 bg-opacity-80 backdrop-blur-sm text-white p-5 rounded-full hover:bg-gray-600"
            >
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                {isVideoOff ? (
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0018 13.657V6.343a2 2 0 00-3.274-1.53l-1.46 1.095a4 4 0 00-5.532 0L3.707 2.293zM2 6a2 2 0 012-2h.5L2 6.5V6z" clipRule="evenodd" />
                ) : (
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                )}
              </svg>
            </button>

            <button
              onClick={handleEndCall}
              className="bg-red-500 text-white p-6 rounded-full hover:bg-red-600 shadow-lg"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </button>

            <button
              onClick={toggleMute}
              className="bg-gray-700 bg-opacity-80 backdrop-blur-sm text-white p-5 rounded-full hover:bg-gray-600"
            >
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                {isMuted ? (
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                )}
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
