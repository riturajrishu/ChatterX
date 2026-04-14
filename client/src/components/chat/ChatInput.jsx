import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useChatStore } from '../../context/ChatContext';
import { Send, Paperclip, Smile, X, Loader2, EyeOff } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';

export default function ChatInput({ chatId, isGroup, replyMessage, onCancelReply }) {
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  const addMessage = useChatStore(state => state.addMessage);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (replyMessage) {
      inputRef.current?.focus();
    }
  }, [replyMessage]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!text.trim() && !replyMessage) return;

    try {
      const tempId = `temp-${Date.now()}`;
      
      // Optimistic Update
      addMessage(chatId, {
        _id: tempId,
        chatId: chatId,
        senderId: user,
        text: text.trim(),
        replyTo: replyMessage,
        isAnonymous: isGroup && isAnonymous,
        timestamp: new Date().toISOString(),
        seenBy: [user._id],
        pending: true
      });

      // Send via socket
      socket.emit('send_message', {
        chatId,
        text: text.trim(),
        replyTo: replyMessage?._id,
        isAnonymous: isGroup && isAnonymous,
        tempId
      });

      setText('');
      onCancelReply();
      setShowEmoji(false);
      
      // Stop typing indicator immediately
      if (isTyping) {
        socket.emit('typing_stop', { chatId });
        setIsTyping(false);
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    
    // Typing indicator logic
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing_start', { chatId });
    }
    
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing_stop', { chatId });
    }, 1500);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
       toast.error('File exceeds 10MB limit');
       return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const tempId = `temp-${Date.now()}`;
      
      addMessage(chatId, {
        _id: tempId,
        chatId: chatId,
        senderId: user,
        text: '',
        fileUrl: data.url,
        replyTo: replyMessage,
        isAnonymous: isGroup && isAnonymous,
        timestamp: new Date().toISOString(),
        seenBy: [user._id],
        pending: true
      });

      // Emit message with fileUrl
      socket.emit('send_message', {
        chatId,
        text: '', // Optional caption could go here
        fileUrl: data.url,
        replyTo: replyMessage?._id,
        isAnonymous: isGroup && isAnonymous,
        tempId
      });
      
      onCancelReply();
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onEmojiClick = (emojiObj) => {
    setText(prev => prev + emojiObj.emoji);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[var(--color-surface-800)] px-3 sm:px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-[var(--color-border)] relative z-20 transition-all duration-300">
      
      {/* Reply Preview */}
      {replyMessage && (
        <div className="absolute top-0 left-0 right-0 -translate-y-full bg-[var(--color-surface-800)] border-t border-x border-[var(--color-border)] p-2 rounded-t-lg shadow-sm flex items-start justify-between z-10 animate-slide-up mx-2">
          <div className="border-l-4 border-[var(--color-primary)] pl-2 text-sm max-w-full overflow-hidden">
             <p className="font-semibold text-[var(--color-primary)]">{replyMessage.senderId?.username || 'Reply'}</p>
             <p className="text-[var(--color-text-secondary)] truncate">{replyMessage.text || 'Attachment'}</p>
          </div>
          <button onClick={onCancelReply} className="text-[var(--color-text-muted)] hover:text-white p-1">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmoji && (
        <div className="absolute bottom-full left-0 sm:left-4 mb-2 z-50 animate-fade-in shadow-glass border border-[var(--color-border)] rounded-lg overflow-hidden max-w-[calc(100vw-1.5rem)]">
           <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" skinTonesDisabled />
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-end gap-2 relative z-20">
        
        {/* Emoji Button */}
        <button 
          type="button" 
          onClick={() => setShowEmoji(!showEmoji)}
          className={`p-2 rounded-full transition-colors ${showEmoji ? 'text-[var(--color-primary)] bg-[var(--color-surface-700)]' : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface-700)]'}`}
        >
          <Smile size={24} />
        </button>

        {/* File Upload / Attachment */}
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2 text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface-700)] rounded-full transition-colors disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Paperclip size={24} />}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload}
          accept="image/*,video/mp4,video/webm,.pdf,.doc,.docx"
        />

        {/* Input Field */}
        <div className="flex-1 bg-[var(--color-surface-900)] rounded-lg flex items-center shadow-inner border border-[var(--color-border-light)] relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full bg-transparent border-none text-[var(--color-text-primary)] rounded-lg py-3 px-4 resize-none max-h-32 min-h-[44px] focus:outline-none focus:ring-0 placeholder:text-[var(--color-text-muted)]"
            rows={1}
            style={{
              height: '44px' // Simplistic auto-resize off for now, fixed height
            }}
          />
          
          {/* Anonymous toggle (Groups only) */}
          {isGroup && (
            <button 
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              title="Toggle Anonymous Mode"
              className={`absolute right-2 p-1.5 rounded-md transition-colors ${isAnonymous ? 'text-[var(--color-warning)] bg-[var(--color-surface-700)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-warning)]'}`}
            >
              <EyeOff size={18} />
            </button>
          )}
        </div>

        {/* Send Button */}
        <button 
          type="submit" 
          disabled={!text.trim() && !replyMessage}
          className="p-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-full transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={20} className="translate-x-0.5 -translate-y-0.5" />
        </button>
      </form>
    </div>
  );
}
