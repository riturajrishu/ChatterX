import { createContext, useContext, useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const CallContext = createContext();

export const useCall = () => {
  return useContext(CallContext);
};

// Agora App ID from environment variable
const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID;

export const CallProvider = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  const [callState, setCallState] = useState('idle'); // 'idle', 'dialing', 'incoming', 'active'
  const [callerName, setCallerName] = useState('');
  const [remoteUser, setRemoteUser] = useState(null); 
  const [isVideo, setIsVideo] = useState(false);
  
  const [localStream, setLocalStream] = useState(null); // Actually local tracks in Agora
  const [remoteStream, setRemoteStream] = useState(null); // Remote tracks
  
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Agora Refs
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const channelRef = useRef(null);

  const cleanupCall = async () => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
    }
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.close();
      localVideoTrackRef.current = null;
    }
    if (clientRef.current) {
      await clientRef.current.leave();
      clientRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setRemoteUser(null);
    setIsMicMuted(false);
    setIsVideoMuted(false);
    channelRef.current = null;
  };

  const handleUserPublished = async (remoteUser, mediaType) => {
    if (!clientRef.current) return;
    
    try {
      await clientRef.current.subscribe(remoteUser, mediaType);
      console.log(`Subscribed to remote ${mediaType} track`);
      
      if (mediaType === 'video') {
         setRemoteStream(remoteUser.videoTrack);
      }
      if (mediaType === 'audio') {
         remoteUser.audioTrack?.play();
      }
    } catch (err) {
      console.error('Subscribe error:', err);
    }
  };

  const handleUserUnpublished = (remoteUser, mediaType) => {
    if (mediaType === 'video') {
       setRemoteStream(null);
    }
  };

  // Socket Listeners for Signaling
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    socket.on('incoming_call', async ({ from, name, isVideo: callIsVideo, channelName }) => {
      if (callState !== 'idle') {
        socket.emit('reject_call', { to: from, reason: 'busy' });
        return;
      }
      setRemoteUser(from);
      setCallerName(name);
      setIsVideo(callIsVideo);
      channelRef.current = channelName;
      setCallState('incoming');
    });

    socket.on('call_accepted', async () => {
      // The person who initiated the call will receive this
      if (callState === 'dialing') {
          setCallState('active');
          toast.success('Call connected');
      }
    });

    socket.on('call_rejected', ({ reason }) => {
      toast.error(`Call declined: ${reason}`);
      cleanupCall();
    });

    socket.on('call_ended', () => {
      toast('The call has ended', { icon: '📞' });
      cleanupCall();
    });

    return () => {
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_ended');
    };
  }, [socket, isConnected, user, callState]);

  const initiateCall = async (userToCall, name, withVideo = true) => {
    try {
      if (!AGORA_APP_ID) {
        toast.error('Agora App ID not configured');
        return;
      }

      setRemoteUser(userToCall);
      setCallerName(name);
      setIsVideo(withVideo);
      setCallState('dialing');

      // Generate unique channel name
      const channelName = [user._id, userToCall].sort().join('_');
      channelRef.current = channelName;

      // Get Token
      const response = await api.get(`/call/token?channelName=${channelName}&role=publisher`);
      const { token, uid } = response.data;

      // Initialize Agora Client
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // Event handlers
      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);

      await client.join(AGORA_APP_ID, channelName, token, uid);

      // Create tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;
      
      setLocalStream({ videoTrack, audioTrack });

      if (!withVideo) {
          videoTrack.setEnabled(false);
          setIsVideoMuted(true);
      }

      // Check if tracks are valid before publishing
      if (client.connectionState === 'CONNECTED') {
         await client.publish([audioTrack, videoTrack]);
      } else {
         console.warn('Client not connected yet, waiting to publish...');
         client.on('connection-state-change', async (curState) => {
           if (curState === 'CONNECTED') {
             await client.publish([audioTrack, videoTrack]);
           }
         });
      }

      // Notify remote user
      socket.emit('call_user', {
        userToCall,
        from: user._id,
        name: user.fullName || user.username,
        isVideo: withVideo,
        channelName
      });

    } catch (e) {
      console.error('Initiate Call Error:', e);
      toast.error('Failed to start call');
      cleanupCall();
    }
  };

  const answerCall = async () => {
    if (!remoteUser || !channelRef.current) return;
    try {
      setCallState('active');

      // Get Token
      const response = await api.get(`/call/token?channelName=${channelRef.current}&role=publisher`);
      const { token, uid } = response.data;

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);

      await client.join(AGORA_APP_ID, channelRef.current, token, uid);

      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;

      setLocalStream({ videoTrack, audioTrack });

      if (!isVideo) {
          videoTrack.setEnabled(false);
          setIsVideoMuted(true);
      }

      await client.publish([audioTrack, videoTrack]);

      socket.emit('answer_call', { to: remoteUser });
    } catch (e) {
      console.error('Answer Call Error:', e);
      // Don't toast if it was a user abort or familiar error
      if (e.message !== 'PERMISSION_DENIED') {
        toast.error('Could not access camera/microphone');
      }
      socket.emit('reject_call', { to: remoteUser });
      cleanupCall();
    }
  };

  const declineCall = () => {
    if (remoteUser) {
      socket.emit('reject_call', { to: remoteUser });
    }
    cleanupCall();
  };

  const endCall = () => {
    if (remoteUser && socket) {
      socket.emit('end_call', { to: remoteUser });
    }
    cleanupCall();
  };

  const toggleMic = () => {
    if (localAudioTrackRef.current) {
      const newState = !isMicMuted;
      localAudioTrackRef.current.setEnabled(!newState);
      setIsMicMuted(newState);
    }
  };

  const toggleVideo = () => {
    if (localVideoTrackRef.current) {
      const newState = !isVideoMuted;
      localVideoTrackRef.current.setEnabled(!newState);
      setIsVideoMuted(newState);
    }
  };

  const toggleSpeaker = async () => {
    try {
      const devices = await AgoraRTC.getPlaybackDevices();
      const newState = !isSpeakerOn;
      setIsSpeakerOn(newState);

      // If we have a remote audio track, try to switch its output
      // Note: This often has limited support in mobile browsers
      if (clientRef.current && remoteUser) {
        // Find the remote user's audio track
        const remoteAgoraUser = clientRef.current.remoteUsers.find(u => u.uid === remoteUser);
        if (remoteAgoraUser && remoteAgoraUser.audioTrack) {
          if (newState) {
            // Try to find a 'speaker' device or just use default
            await remoteAgoraUser.audioTrack.setPlaybackDevice(devices[0]?.deviceId || 'default');
          } else {
            // Try to find an 'earpiece' or secondary device if it exists
            const earpiece = devices.find(d => d.label.toLowerCase().includes('earpiece') || d.label.toLowerCase().includes('handset'));
            if (earpiece) {
              await remoteAgoraUser.audioTrack.setPlaybackDevice(earpiece.deviceId);
            } else if (devices.length > 1) {
              await remoteAgoraUser.audioTrack.setPlaybackDevice(devices[1].deviceId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error toggling speaker:', error);
    }
  };

  return (
    <CallContext.Provider value={{
      callState,
      callerName,
      isVideo,
      localStream,
      remoteStream,
      isMicMuted,
      isVideoMuted,
      initiateCall,
      answerCall,
      declineCall,
      endCall,
      toggleMic,
      toggleVideo,
      isSpeakerOn,
      toggleSpeaker
    }}>
      {children}
    </CallContext.Provider>
  );
};
