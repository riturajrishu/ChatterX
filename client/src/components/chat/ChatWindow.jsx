import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChatStore } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { ChevronLeft, MoreVertical, Phone, Video, Download, X, Trash2, AlertTriangle } from 'lucide-react';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import Spinner from '../ui/Spinner';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useCall } from '../../context/CallContext';

export default function ChatWindow({ onBack }) {
  const { user } = useAuth();
  const { selectedChat, messages, fetchMessages, hasMore, removeMessage, onlineUsers } = useChatStore();
  const { socket } = useSocket();
  const { initiateCall } = useCall();
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // userId -> username
  const [replyMessage, setReplyMessage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // message to show delete modal for
  
  const messagesEndRef = useRef(null);
  const listRef = useRef(null);
  
  const chatId = selectedChat?._id;
  const chatMessages = messages[chatId] || [];
  const hasMoreMessages = hasMore[chatId];

  // Fetch initial messages when chat is selected
  useEffect(() => {
    if (chatId && chatMessages.length === 0) {
      fetchMessages(chatId);
    }
    // Cancel any active reply when switching chats
    setReplyMessage(null);
    setDeleteTarget(null);
  }, [chatId]);

  // Handle typing indicator socket events
  useEffect(() => {
    if (!socket) return;
    
    const handleTyping = ({ chatId: eventChatId, userId, username, isTyping }) => {
      if (eventChatId !== chatId) return;
      
      setTypingUsers(prev => {
        const next = { ...prev };
        if (isTyping) {
          next[userId] = username;
        } else {
          delete next[userId];
        }
        return next;
      });
    };

    socket.on('typing_display', handleTyping);
    return () => socket.off('typing_display', handleTyping);
  }, [socket, chatId]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (listRef.current) {
      // Simple heuristic: if we are close to bottom, snap to bottom
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [chatMessages]);

  const handleScroll = async () => {
    if (!listRef.current || loadingMore || !hasMoreMessages) return;
    
    // If scrolled to top, fetch older messages
    if (listRef.current.scrollTop === 0) {
      setLoadingMore(true);
      const oldestMessage = chatMessages[0];
      if (oldestMessage) {
        const previousScrollHeight = listRef.current.scrollHeight;
        await fetchMessages(chatId, oldestMessage.timestamp);
        // Maintain scroll position after prepending
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight - previousScrollHeight;
          }
          setLoadingMore(false);
        }, 0);
      } else {
        setLoadingMore(false);
      }
    }
  };

  // Mark all as seen when chat opens AND emit socket events for real-time blue ticks
  useEffect(() => {
    if (chatId && chatMessages.length > 0) {
      const unseenMessages = chatMessages
        .filter(m => m.senderId._id !== user._id && !(m.seenBy || []).includes(user._id));
        
      if (unseenMessages.length > 0) {
         // Call the batch API
         api.put(`/messages/${chatId}/seen-all`).catch(e => console.error(e));

         // Also emit individual socket seen events for real-time blue tick updates
         if (socket) {
           unseenMessages.forEach(m => {
             socket.emit('message_seen', { messageId: m._id, chatId });
           });
         }
      }
    }
  }, [chatId, chatMessages, user._id, socket]);

  // Delete message handler
  const handleDeleteMessage = async (type) => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/messages/${deleteTarget._id}?type=${type}`);
      // For 'me' deletion, remove locally. For 'everyone', server emits socket event.
      if (type === 'me') {
        removeMessage(chatId, deleteTarget._id);
      }
      toast.success(type === 'everyone' ? 'Deleted for everyone' : 'Deleted for you');
    } catch (error) {
      toast.error('Failed to delete message');
    }
    setDeleteTarget(null);
  };

  if (!selectedChat) return null;

  const handleCall = (isVideo) => {
    if (selectedChat.isGroup) {
      return toast.error('Calls are currently only supported in 1-on-1 chats.');
    }
    const otherParticipant = selectedChat.participants.find(p => p._id !== user._id);
    if (otherParticipant) {
      initiateCall(otherParticipant._id, otherParticipant.fullName || otherParticipant.username, isVideo);
    }
  };

  const isGroup = selectedChat.isGroup;
  let name, avatar, isOnline;
  
  if (isGroup) {
    name = selectedChat.groupId?.name || 'Group';
    avatar = selectedChat.groupId?.avatar;
  } else {
    const other = selectedChat.participants.find(p => p._id !== user._id);
    name = other?.fullName || other?.username || 'Unknown';
    avatar = other?.avatar;
    // Derive real-time status from the global onlineUsers set
    isOnline = other ? onlineUsers.has(other._id) : false;
  }

  const typingNames = Object.values(typingUsers);
  const typingText = typingNames.length > 0 
    ? typingNames.length === 1 
      ? `${typingNames[0]} is typing...` 
      : `${typingNames.length} people are typing...` 
    : '';

  const isDeleteTargetOwn = deleteTarget?.senderId?._id === user._id;

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface-900)] relative w-full">
      {/* Header */}
      <div className="h-16 flex-shrink-0 px-4 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-800)] z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="md:hidden p-1 text-[var(--color-text-secondary)] hover:text-white"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-[var(--color-surface-600)] flex items-center justify-center flex-shrink-0 text-md shadow-sm">
               {avatar ? (
                 <img src={avatar} className="w-full h-full rounded-full object-cover" />
               ) : (
                 <span className="font-bold">{name.charAt(0).toUpperCase()}</span>
               )}
            </div>
            {!isGroup && isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--color-success)] rounded-full border-2 border-[var(--color-surface-800)]"></div>
            )}
          </div>
          
          <div className="flex flex-col">
            <h3 className="font-semibold text-[var(--color-text-primary)]">{name}</h3>
            {typingText ? (
              <span className="text-xs text-[var(--color-success)] animate-typing font-medium">{typingText}</span>
            ) : (
              <span className="text-xs text-[var(--color-text-secondary)]">
                {isGroup ? `${selectedChat.participants.length} members` : (isOnline ? 'Online' : 'Offline')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 text-[var(--color-text-secondary)]">
          <button onClick={() => handleCall(false)} className="hover:text-white transition-colors p-1"><Phone size={20} /></button>
          <button onClick={() => handleCall(true)} className="hover:text-white transition-colors p-1"><Video size={20} /></button>
          <button className="hover:text-white transition-colors p-1"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Messages Area - Background Image like WhatsApp */}
      <div className="flex-1 overflow-hidden relative bg-[var(--color-surface-900)]">
         {/* Optional background pattern */}
         <div className="absolute inset-0 opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(var(--color-text-secondary) 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
         
         <div 
           ref={listRef}
           onScroll={handleScroll}
           className="h-full overflow-y-auto px-3 sm:px-4 py-4 z-10 relative flex flex-col gap-1"
         >
            {loadingMore && <div className="flex justify-center py-2"><Spinner size="sm"/></div>}
            
            {chatMessages.length === 0 && (
              <div className="flex justify-center items-center h-full">
                <div className="bg-[var(--color-surface-800)] px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)]">
                  Messages are end-to-end securely transmitted.
                </div>
              </div>
            )}

            {chatMessages.map((msg, idx) => {
              const showAvatar = isGroup && msg.senderId?._id !== user._id && 
                (idx === 0 || chatMessages[idx-1].senderId?._id !== msg.senderId?._id);
                
              return (
                <ChatBubble 
                  key={msg._id} 
                  message={msg} 
                  isOwn={msg.senderId?._id === user._id}
                  isGroup={isGroup}
                  showAvatar={showAvatar}
                  onReply={() => setReplyMessage(msg)}
                  onDelete={(m) => setDeleteTarget(m)}
                  onImageClick={(url) => setSelectedImage(url)}
                />
              );
            })}
            <div ref={messagesEndRef} />
         </div>
      </div>

      {/* Input Area */}
      <ChatInput 
        chatId={chatId} 
        isGroup={isGroup} 
        replyMessage={replyMessage}
        onCancelReply={() => setReplyMessage(null)}
      />

      {/* Delete Message Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteTarget(null)}>
          <div 
            className="bg-[var(--color-surface-800)] rounded-2xl p-6 max-w-sm w-full shadow-glass border border-[var(--color-border)] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-danger)]/20 flex items-center justify-center">
                <Trash2 size={20} className="text-[var(--color-danger)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Delete Message?</h3>
            </div>
            
            <p className="text-sm text-[var(--color-text-secondary)] mb-1 line-clamp-2">
              "{deleteTarget.text || '📎 Attachment'}"
            </p>

            <div className="flex flex-col gap-2 mt-5">
              {isDeleteTargetOwn && (
                <button
                  onClick={() => handleDeleteMessage('everyone')}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <AlertTriangle size={16} />
                  Delete for Everyone
                </button>
              )}
              <button
                onClick={() => handleDeleteMessage('me')}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-surface-600)] hover:bg-[var(--color-surface-700)] text-[var(--color-text-primary)] font-medium transition-colors"
              >
                Delete for Me
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full py-2.5 px-4 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedImage(null)}>
          <button 
            onClick={() => setSelectedImage(null)} 
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 p-2 rounded-full transition-all z-10"
          >
            <X size={24}/>
          </button>
          
          <a 
            href={selectedImage} 
            download
            target="_blank" 
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-16 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 p-2 rounded-full transition-all z-10" 
            title="Download/Open Full"
          >
            <Download size={24}/>
          </a>
          
          <img 
            src={selectedImage} 
            alt="Fullscreen view" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-in" 
            draggable="false"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
