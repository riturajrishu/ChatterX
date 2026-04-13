import { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User } from 'lucide-react';
import Button from '../ui/Button';

export default function CallOverlay() {
  const { 
    callState, 
    callerName, 
    isVideo, 
    localStream, 
    remoteStream, 
    isMicMuted, 
    isVideoMuted,
    answerCall, 
    declineCall, 
    endCall, 
    toggleMic, 
    toggleVideo 
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null); // Dedicated ref for audio-only scenarios

  // Attach local stream to video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  // Attach remote stream to video or audio
  useEffect(() => {
    if (callState === 'active' && remoteStream) {
      if (isVideo && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (!isVideo && remoteAudioRef.current) {
         remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callState, isVideo]);

  if (callState === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-surface-900)] text-white overflow-hidden animate-fade-in backdrop-blur-3xl bg-opacity-95">
      
      {/* --- INCOMING CALL STATE --- */}
      {callState === 'incoming' && (
        <div className="flex flex-col items-center p-8 rounded-3xl glass-strong shadow-2xl relative w-full max-w-sm">
          <div className="absolute inset-0 w-32 h-32 m-auto rounded-full bg-[var(--color-primary)] opacity-20 animate-ping"></div>
          
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative z-10 mb-4 shadow-xl border-4 border-[var(--color-surface-800)]">
             <User size={40} className="text-gray-400" />
          </div>
          
          <h2 className="text-xl font-bold mb-1">{callerName || 'Unknown Caller'}</h2>
          <p className="text-[var(--color-text-secondary)] mb-8 flex items-center gap-2">
            {isVideo ? <Video size={16} /> : <Phone size={16} />} 
            Incoming {isVideo ? 'Video' : 'Audio'} Call...
          </p>

          <div className="flex items-center gap-6 w-full px-4 justify-center relative z-10">
            <button 
              onClick={declineCall}
              className="w-14 h-14 rounded-full bg-[var(--color-danger)] text-white flex items-center justify-center hover:brightness-110 shadow-lg transform hover:scale-105 transition-all"
            >
              <PhoneOff size={24} />
            </button>
            
            <button 
              onClick={answerCall}
              className="w-14 h-14 rounded-full bg-[var(--color-success)] text-white flex items-center justify-center hover:brightness-110 shadow-lg transform hover:scale-105 transition-all animate-pulse-soft"
            >
              <Phone size={24} className="fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* --- DIALING STATE --- */}
      {callState === 'dialing' && (
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-surface-700)] to-[var(--color-surface-800)] flex items-center justify-center mb-6 shadow-2xl border-4 border-[var(--color-surface-900)]">
             <User size={40} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Dialing {callerName}...</h2>
          <p className="text-[var(--color-text-secondary)] animate-pulse">Waiting for answer...</p>
          
          <button 
            onClick={endCall}
            className="mt-12 w-14 h-14 rounded-full bg-[var(--color-danger)] text-white flex items-center justify-center shadow-[0_0_20px_rgba(255,0,0,0.3)] hover:scale-105 transition-transform"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      )}

      {/* --- ACTIVE CALL STATE --- */}
      {callState === 'active' && (
        <div className="relative w-full h-full flex flex-col bg-black">
          
          {isVideo ? (
             <>
               {/* Remote Full Screen Video */}
               <video 
                 ref={remoteVideoRef} 
                 autoPlay 
                 playsInline 
                 className="absolute inset-0 w-full h-full object-cover"
               />
               
               {/* Local Picture in Picture Frame */}
               <div className="absolute top-6 right-6 w-28 h-40 sm:w-40 sm:h-56 bg-black rounded-lg sm:rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transform -scale-x-100" 
                  />
               </div>
             </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center w-full relative">
               {/* Ambient animated ring for audio calls */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="w-[40vh] h-[40vh] border border-[var(--color-primary)]/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
               </div>
               <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative z-10 shadow-2xl border-4 border-gray-900">
                 <User size={56} className="text-gray-400" />
               </div>
               <h2 className="text-2xl mt-6 font-bold relative z-10">{callerName}</h2>
               <p className="text-[var(--color-primary)] mt-1 animate-pulse relative z-10">Active Info</p>
               
               {/* Hidden audio element to play remote stream */}
               <audio ref={remoteAudioRef} autoPlay />
            </div>
          )}

          {/* Controls Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[var(--color-surface-800)]/80 backdrop-blur-md px-6 py-4 rounded-full shadow-2xl border border-white/10">
             <button 
               onClick={toggleMic}
               className={`p-3 rounded-full transition-colors ${isMicMuted ? 'bg-[var(--color-surface-700)] text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
             >
               {isMicMuted ? <MicOff size={22} /> : <Mic size={22} />}
             </button>
             
             {isVideo && (
               <button 
                 onClick={toggleVideo}
                 className={`p-3 rounded-full transition-colors ${isVideoMuted ? 'bg-[var(--color-surface-700)] text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
               >
                 {isVideoMuted ? <VideoOff size={22} /> : <Video size={22} />}
               </button>
             )}

             <button 
               onClick={endCall}
               className="p-3 ml-2 rounded-full bg-[var(--color-danger)] text-white shadow-lg hover:brightness-110 hover:scale-105 transition-all"
             >
               <PhoneOff size={22} />
             </button>
          </div>
        </div>
      )}

    </div>
  );
}
