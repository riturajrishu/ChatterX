import { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Agora Refs
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const channelRef = useRef(null);

  // Use a ref for callState so socket listeners always have the latest value
  // without needing callState in their dependency array
  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const cleanupCall = useCallback(async () => {
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
    } catch (e) { console.warn('Audio track cleanup error:', e); }

    try {
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }
    } catch (e) { console.warn('Video track cleanup error:', e); }

    try {
      if (clientRef.current) {
        await clientRef.current.leave();
      }
    } catch (e) { console.warn('Agora client leave error:', e); }
    
    clientRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setRemoteUser(null);
    setIsMicMuted(false);
    setIsVideoMuted(false);
    channelRef.current = null;
  }, []);

  const handleUserPublished = useCallback(async (remoteUser, mediaType) => {
    if (!clientRef.current) return;
    
    try {
      await clientRef.current.subscribe(remoteUser, mediaType);
      
      if (mediaType === 'video') {
         setRemoteStream(remoteUser.videoTrack);
      }
      if (mediaType === 'audio') {
         remoteUser.audioTrack?.play();
      }
    } catch (err) {
      console.error('Subscribe error:', err);
    }
  }, []);

  const handleUserUnpublished = useCallback((remoteUser, mediaType) => {
    if (mediaType === 'video') {
       setRemoteStream(null);
    }
  }, []);

  // Socket Listeners for Signaling
  // IMPORTANT: No `callState` in deps. We use callStateRef instead to avoid
  // re-registering all listeners on every state change.
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const onIncomingCall = ({ from, name, isVideo: callIsVideo, channelName }) => {
      if (callStateRef.current !== 'idle') {
        socket.emit('reject_call', { to: from, reason: 'busy' });
        return;
      }
      setRemoteUser(from);
      setCallerName(name);
      setIsVideo(callIsVideo);
      channelRef.current = channelName;
      setCallState('incoming');
    };

    const onCallAccepted = () => {
      if (callStateRef.current === 'dialing') {
        setCallState('active');
        toast.success('Call connected');
      }
    };

    const onCallRejected = ({ reason }) => {
      toast.error(`Call declined: ${reason}`);
      cleanupCall();
    };

    const onCallEnded = () => {
      toast('The call has ended', { icon: '📞' });
      cleanupCall();
    };

    socket.on('incoming_call', onIncomingCall);
    socket.on('call_accepted', onCallAccepted);
    socket.on('call_rejected', onCallRejected);
    socket.on('call_ended', onCallEnded);

    return () => {
      socket.off('incoming_call', onIncomingCall);
      socket.off('call_accepted', onCallAccepted);
      socket.off('call_rejected', onCallRejected);
      socket.off('call_ended', onCallEnded);
    };
  }, [socket, isConnected, user, cleanupCall]);

  const initiateCall = useCallback(async (userToCall, name, withVideo = true) => {
    try {
      if (!AGORA_APP_ID) {
        toast.error('Agora App ID not configured');
        return;
      }

      setRemoteUser(userToCall);
      setCallerName(name);
      setIsVideo(withVideo);
      setCallState('dialing');

      const channelName = [user._id, userToCall].sort().join('_');
      channelRef.current = channelName;

      const response = await api.get(`/call/token?channelName=${channelName}&role=publisher`);
      const { token, uid } = response.data;

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);

      await client.join(AGORA_APP_ID, channelName, token, uid);

      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;
      
      setLocalStream({ videoTrack, audioTrack });

      if (!withVideo) {
          videoTrack.setEnabled(false);
          setIsVideoMuted(true);
      }

      if (client.connectionState === 'CONNECTED') {
         await client.publish([audioTrack, videoTrack]);
      } else {
         const onStateChange = async (curState) => {
           if (curState === 'CONNECTED') {
             try { await client.publish([audioTrack, videoTrack]); } catch(e) { console.error(e); }
             client.off('connection-state-change', onStateChange);
           }
         };
         client.on('connection-state-change', onStateChange);
      }

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
  }, [user, socket, handleUserPublished, handleUserUnpublished, cleanupCall]);

  const answerCall = useCallback(async () => {
    if (!remoteUser || !channelRef.current) return;
    try {
      setCallState('active');

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
      if (e.message !== 'PERMISSION_DENIED') {
        toast.error('Could not access camera/microphone');
      }
      socket.emit('reject_call', { to: remoteUser });
      cleanupCall();
    }
  }, [remoteUser, isVideo, socket, handleUserPublished, handleUserUnpublished, cleanupCall]);

  const declineCall = useCallback(() => {
    if (remoteUser) {
      socket.emit('reject_call', { to: remoteUser });
    }
    cleanupCall();
  }, [remoteUser, socket, cleanupCall]);

  const endCall = useCallback(() => {
    if (remoteUser && socket) {
      socket.emit('end_call', { to: remoteUser });
    }
    cleanupCall();
  }, [remoteUser, socket, cleanupCall]);

  const toggleMic = useCallback(() => {
    if (localAudioTrackRef.current) {
      const newState = !isMicMuted;
      localAudioTrackRef.current.setEnabled(!newState);
      setIsMicMuted(newState);
    }
  }, [isMicMuted]);

  const toggleVideo = useCallback(() => {
    if (localVideoTrackRef.current) {
      const newState = !isVideoMuted;
      localVideoTrackRef.current.setEnabled(!newState);
      setIsVideoMuted(newState);
    }
  }, [isVideoMuted]);

  const toggleSpeaker = useCallback(async () => {
    try {
      const devices = await AgoraRTC.getPlaybackDevices();
      const newState = !isSpeakerOn;
      setIsSpeakerOn(newState);

      if (clientRef.current) {
        const remoteAgoraUser = clientRef.current.remoteUsers?.[0];
        if (remoteAgoraUser?.audioTrack) {
          if (newState) {
            await remoteAgoraUser.audioTrack.setPlaybackDevice(devices[0]?.deviceId || 'default');
          } else {
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
  }, [isSpeakerOn]);

  // Memoize context value to prevent unnecessary re-renders of ALL consumers
  const contextValue = useMemo(() => ({
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
  }), [
    callState, callerName, isVideo, localStream, remoteStream,
    isMicMuted, isVideoMuted, initiateCall, answerCall, declineCall,
    endCall, toggleMic, toggleVideo, isSpeakerOn, toggleSpeaker
  ]);

  return (
    <CallContext.Provider value={contextValue}>
      {children}
    </CallContext.Provider>
  );
};
