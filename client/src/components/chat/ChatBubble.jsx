import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Reply, Trash2, ShieldAlert, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ChatBubble({ message, isOwn, showAvatar, onReply, onImageClick }) {
  const { user } = useAuth();
  
  if (!message) return null;

  const handleDelete = async () => {
    try {
      await api.delete(`/messages/${message._id}`);
      // Optimistic update would be better mapped via context, but reloading works for now
      toast.success('Message deleted for you');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const isSeen = message.seenBy?.some(id => id !== message.senderId?._id);
  const timeStr = message.timestamp ? format(new Date(message.timestamp), 'HH:mm') : '';

  // Swipe logic for mobile
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (touchStartRef.current === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStartRef.current;
    
    // swipe right to reply, swipe left to delete (only if own)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 60));
    } else if (isOwn && diff < 0) {
      setSwipeOffset(Math.max(diff, -60));
    }
  };

  const handleTouchEnd = () => {
    // Threshold is 40px
    if (swipeOffset > 40) {
      onReply();
    } else if (swipeOffset < -40 && isOwn) {
      handleDelete();
    }
    setSwipeOffset(0);
    touchStartRef.current = null;
  };

  return (
    <div className="relative w-full mb-1 group">
      {/* Background Icons revealed during swipe */}
      <div className="absolute inset-0 flex items-center justify-between px-4" style={{ zIndex: 0, opacity: Math.abs(swipeOffset) > 0 ? 1 : 0 }}>
         {/* Left Side (Reply) */}
         <div className={`text-[var(--color-primary)] transition-transform ${swipeOffset > 40 ? 'scale-125' : 'scale-100'}`}>
            <Reply size={20} />
         </div>
         {/* Right Side (Delete) */}
         {isOwn && (
           <div className={`text-[var(--color-danger)] transition-transform ${swipeOffset < -40 ? 'scale-125' : 'scale-100'}`}>
              <Trash2 size={20} />
           </div>
         )}
      </div>

      <div 
        className={`flex w-full relative z-10 ${isOwn ? 'justify-end' : 'justify-start'} ${touchStartRef.current === null ? 'transition-transform duration-200' : ''}`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      
      {/* Avatar for group chats (incoming only) */}
      {!isOwn && showAvatar && (
         <div className="w-8 h-8 rounded-full bg-[var(--color-surface-600)] shrink-0 mr-2 mt-1 flex items-center justify-center overflow-hidden">
           {message.senderId?.avatar ? (
             <img src={message.senderId.avatar} className="w-full h-full object-cover" />
           ) : (
             <span className="text-xs font-bold">{message.senderId?.username?.charAt(0).toUpperCase()}</span>
           )}
         </div>
      )}
      {!isOwn && !showAvatar && <div className="w-8 mr-2 shrink-0"></div>}

      <div className={`
          relative max-w-[75%] md:max-w-[65%] rounded-lg px-3 py-1.5 shadow-sm
          ${isOwn ? 'bg-[var(--color-bubble-sent)] bubble-sent rounded-tr-none' : 'bg-[var(--color-surface-800)] bubble-received rounded-tl-none border border-[var(--color-border)]'}
        `}
      >
        {/* Context Menu (Hover) */}
        <div className={`absolute top-1 ${isOwn ? '-left-16' : '-right-16'} opacity-0 group-hover:opacity-100 transition-opacity flex bg-[var(--color-surface-700)] rounded shadow-sm border border-[var(--color-border)]`}>
           <button onClick={onReply} className="p-1.5 hover:text-white text-[var(--color-text-secondary)]"><Reply size={14}/></button>
           {isOwn && <button onClick={handleDelete} className="p-1.5 hover:text-[var(--color-danger)] text-[var(--color-text-secondary)]"><Trash2 size={14}/></button>}
        </div>

        {/* Sender Name for Groups */}
        {!isOwn && showAvatar && (
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-xs font-semibold text-[var(--color-primary)]">
              {message.isAnonymous ? 'Anonymous' : message.senderId?.username}
            </span>
            {message.isAnonymous && <ShieldAlert size={12} className="text-[var(--color-warning)]" />}
          </div>
        )}

        {/* Reply Preview Box */}
        {message.replyTo && (
           <div className="mb-1 p-2 rounded bg-black/20 border-l-4 border-[var(--color-primary)] opacity-80 text-sm flex flex-col">
              <span className="font-semibold text-xs text-[var(--color-primary-light)]">
                 {message.replyTo?.senderId === user._id ? 'You' : message.replyTo?.senderId?.username || 'Unknown'}
              </span>
              <span className="truncate text-gray-300">{message.replyTo?.text || 'Attachment'}</span>
           </div>
        )}

        {/* Media Content */}
        {message.fileUrl && (
          <div className="mt-1 mb-1">
             {message.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
               <img 
                 src={message.fileUrl} 
                 alt="attachment" 
                 className="rounded-md max-h-60 object-cover cursor-pointer" 
                 loading="lazy" 
                 onClick={() => onImageClick?.(message.fileUrl)}
                 draggable="false"
               />
             ) : message.fileUrl.match(/\.(mp4|webm)$/i) ? (
               <video src={message.fileUrl} controls className="rounded-md max-h-60" />
             ) : (
               <a href={message.fileUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] hover:underline truncate inline-block max-w-[200px]">
                 📎 View Document
               </a>
             )}
          </div>
        )}

        {/* Text Content */}
        {message.text && (
          <p className="text-[var(--color-text-primary)] whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.text}
          </p>
        )}

        {/* Timestamp and Status */}
        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isOwn ? 'text-[var(--color-primary-light)]' : 'text-[var(--color-text-muted)]'}`}>
           <span>{timeStr}</span>
           {isOwn && (
             message.pending ? <Clock size={14} className="ml-0.5 opacity-70" /> :
             isSeen ? <CheckCheck size={14} className="text-[#53bdeb] ml-0.5" /> : <Check size={14} className="ml-0.5" />
           )}
        </div>
        </div>
      </div>
    </div>
  );
}
