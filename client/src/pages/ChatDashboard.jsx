import { useEffect, useState } from 'react';
import { useChatStore } from '../context/ChatContext';
import { useSocket } from '../context/SocketContext';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';

export default function ChatDashboard() {
  const { fetchChats, selectedChat, setSelectedChat, addMessage, updateMessageSeen } = useChatStore();
  const { socket, isConnected } = useSocket();
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);

  // Initial fetch
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Handle mobile view toggling and dynamic socket room joining
  useEffect(() => {
    if (selectedChat) {
      setIsMobileListVisible(false);
      if (socket && isConnected) {
        socket.emit('join_chat', selectedChat._id);
      }
    }
  }, [selectedChat, socket, isConnected]);

  const handleBackToList = () => {
    setIsMobileListVisible(true);
    setSelectedChat(null); // Fix: Clear selection so it doesn't auto-open returning from settings
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleReceiveMessage = (messageData) => {
      // messageData should contain chatId
      addMessage(messageData.chatId, messageData);
    };

    const handleMessageSeen = ({ messageId, chatId, userId }) => {
      updateMessageSeen(chatId, messageId, userId);
    };

    const handleChatUpdate = () => {
       // Refresh list when group is created/updated or chat pinned
       fetchChats();
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_seen_update', handleMessageSeen);
    // You could listen to other events here like user online/offline to update specific participant statuses

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_seen_update', handleMessageSeen);
    };
  }, [socket, isConnected, addMessage, updateMessageSeen, fetchChats]);

  return (
    <div className="flex h-screen bg-[var(--color-surface-900)] overflow-hidden">
      {/* Sidebar - hidden on mobile if chat is active */}
      <div 
        className={`w-full md:w-[360px] lg:w-[400px] border-r border-[var(--color-border)] flex-shrink-0 bg-[var(--color-surface-800)] transition-all
          ${!isMobileListVisible ? 'hidden md:flex' : 'flex'}
        `}
      >
        <Sidebar onChatSelect={() => setIsMobileListVisible(false)} />
      </div>

      {/* Main Chat Area */}
      <div 
        className={`flex-1 flex flex-col h-full bg-[var(--color-surface-900)] relative
           ${isMobileListVisible ? 'hidden md:flex' : 'flex'}
        `}
      >
        {selectedChat ? (
          <ChatWindow onBack={handleBackToList} />
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)]">
            <div className="w-24 h-24 rounded-full bg-[var(--color-surface-800)] flex items-center justify-center mb-6 shadow-glass">
               <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
            </div>
            <h2 className="text-2xl font-medium text-[var(--color-text-primary)] mb-2">Whispr Web</h2>
            <p className="max-w-md text-center">Select a chat to start messaging or create a new group. Messages are protected and real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
