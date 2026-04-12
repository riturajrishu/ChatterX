import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChatStore } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { ChevronLeft, MoreVertical, Phone, Video, Download, X } from 'lucide-react';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import Spinner from '../ui/Spinner';

export default function ChatWindow({ onBack }) {
  const { user } = useAuth();
  const { selectedChat, messages, fetchMessages, hasMore } = useChatStore();
  const { socket } = useSocket();
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // userId -> username
  const [replyMessage, setReplyMessage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  
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

  // Mark all as seen when chat opens
  useEffect(() => {
    if (chatId && chatMessages.length > 0) {
      const unseenIds = chatMessages
        .filter(m => m.senderId._id !== user._id && !(m.seenBy || []).includes(user._id))
        .map(m => m._id);
        
      if (unseenIds.length > 0) {
         // In a real implementation we'd batch this to the server
         // Wait, we have a route for this!
         import('../../services/api').then(({ default: api }) => {
           api.put(`/messages/${chatId}/seen-all`).catch(e => console.error(e));
         });
      }
    }
  }, [chatId, chatMessages, user._id]);

  if (!selectedChat) return null;

  const isGroup = selectedChat.isGroup;
  let name, avatar, isOnline;
  
  if (isGroup) {
    name = selectedChat.groupId?.name || 'Group';
    avatar = selectedChat.groupId?.avatar;
  } else {
    const other = selectedChat.participants.find(p => p._id !== user._id);
    name = other?.username || 'Unknown';
    avatar = other?.avatar;
    isOnline = other?.isOnline;
  }

  const typingNames = Object.values(typingUsers);
  const typingText = typingNames.length > 0 
    ? typingNames.length === 1 
      ? `${typingNames[0]} is typing...` 
      : `${typingNames.length} people are typing...` 
    : '';

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface-900)] relative w-full">
      {/* Header */}
      <div className="h-16 flex-shrink-0 px-4 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-800)] z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="md:hidden p-1 mr-1 text-[var(--color-text-secondary)] hover:text-white"
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
        
        <div className="flex items-center gap-4 text-[var(--color-text-secondary)]">
          <button className="hover:text-white transition-colors hidden sm:block"><Phone size={20} /></button>
          <button className="hover:text-white transition-colors hidden sm:block"><Video size={20} /></button>
          <button className="hover:text-white transition-colors"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Messages Area - Background Image like WhatsApp */}
      <div className="flex-1 overflow-hidden relative bg-[var(--color-surface-900)]">
         {/* Optional background pattern */}
         <div className="absolute inset-0 opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(var(--color-text-secondary) 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
         
         <div 
           ref={listRef}
           onScroll={handleScroll}
           className="h-full overflow-y-auto px-4 py-4 z-10 relative flex flex-col gap-1"
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
                  showAvatar={showAvatar}
                  onReply={() => setReplyMessage(msg)}
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
