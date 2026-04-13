import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CallContext = createContext();

export const useCall = () => {
  return useContext(CallContext);
};

export const CallProvider = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  const [callState, setCallState] = useState('idle'); // 'idle', 'dialing', 'incoming', 'active'
  const [incomingCall, setIncomingCall] = useState(null);
  const [callerName, setCallerName] = useState('');
  const [remoteUser, setRemoteUser] = useState(null); // The other person ID
  const [isVideo, setIsVideo] = useState(false);
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceCandidatesQueue = useRef([]); // Buffer for candidates received before remote description

  // ICE Servers Configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  };

  const cleanupCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setIncomingCall(null);
    setRemoteUser(null);
    setIsMicMuted(false);
    setIsVideoMuted(false);
    iceCandidatesQueue.current = [];
  };

  const createPeerConnection = (otherUserId) => {
    const pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', { to: otherUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const processIceQueue = async () => {
    if (pcRef.current && pcRef.current.remoteDescription) {
      while (iceCandidatesQueue.current.length > 0) {
        const candidate = iceCandidatesQueue.current.shift();
        try {
           await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
           console.error('Error adding delayed ice candidate', e);
        }
      }
    }
  };

  // Socket Listeners
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    socket.on('incoming_call', async ({ signal, from, name, isVideo: callIsVideo }) => {
      if (callState !== 'idle') {
        socket.emit('reject_call', { to: from });
        return;
      }
      setIncomingCall(signal);
      setRemoteUser(from);
      setCallerName(name);
      setIsVideo(callIsVideo);
      setCallState('incoming');
    });

    socket.on('call_accepted', async ({ signal }) => {
      setCallState('active');
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          processIceQueue();
        } catch (error) {
          console.error("Error setting remote description:", error);
          endCall();
        }
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

    socket.on('ice_candidate', async ({ candidate }) => {
      if (pcRef.current) {
        if (pcRef.current.remoteDescription) {
           try {
             await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
           } catch(e) {
             console.error("Error adding ice candidate:", e);
           }
        } else {
           iceCandidatesQueue.current.push(candidate);
        }
      }
    });

    return () => {
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_ended');
      socket.off('ice_candidate');
    };
  }, [socket, isConnected, user, callState]);

  // Actions
  const initMedia = async (video) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media devices', error);
      toast.error('Could not access Camera or Microphone. Please check permissions.');
      throw error;
    }
  };

  const initiateCall = async (userToCall, name, withVideo = true) => {
    try {
      const stream = await initMedia(withVideo);
      setRemoteUser(userToCall);
      setCallerName(name);
      setIsVideo(withVideo);
      setCallState('dialing');

      const pc = createPeerConnection(userToCall);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_user', {
        userToCall,
        signalData: offer,
        from: user._id,
        name: user.username,
        isVideo: withVideo
      });
    } catch (e) {
      cleanupCall();
    }
  };

  const answerCall = async () => {
    if (!incomingCall || !remoteUser) return;
    try {
      const stream = await initMedia(isVideo);
      setCallState('active');

      const pc = createPeerConnection(remoteUser);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall));
      processIceQueue();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', { to: remoteUser, signal: answer });
    } catch (e) {
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
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  return (
    <CallContext.Provider value={{
      callState,
      incomingCall,
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
      toggleVideo
    }}>
      {children}
    </CallContext.Provider>
  );
};
