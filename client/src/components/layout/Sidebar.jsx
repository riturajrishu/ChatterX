import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChatStore } from '../../context/ChatContext';
import { LogOut, Settings, Search, Edit, MoreVertical, Pin, Users, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CreateGroupModal from '../modals/CreateGroupModal';

export default function Sidebar({ onChatSelect }) {
  const { user, logout } = useAuth();
  const { chats, selectedChat, setSelectedChat, togglePin } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length > 1) {
      setIsSearching(true);
      try {
        const { data } = await api.get(`/users/search?q=${query}`);
        setSearchResults(data.users);
      } catch (error) {
        console.error('Search failed', error);
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleStartChat = async (otherUser) => {
    try {
      const { data } = await api.post('/chats', { participantId: otherUser._id });
      setSelectedChat(data.chat);
      setSearchQuery('');
      setIsSearching(false);
      onChatSelect();
    } catch (error) {
      console.error('Start chat failed', error);
    }
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    onChatSelect();
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-800)] z-10">
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/settings')}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="You" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center font-bold text-lg">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-semibold">{user?.username}</span>
        </div>
        
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <button 
            onClick={() => setIsGroupModalOpen(true)}
            className="p-2 rounded-full hover:bg-[var(--color-surface-700)] transition-colors"
            title="Create Group"
          >
            <Users size={20} />
          </button>
          {['admin', 'owner'].includes(user?.role) && (
            <button 
              onClick={() => navigate('/admin')}
              className="p-2 rounded-full hover:bg-[var(--color-surface-700)] transition-colors"
              title="Admin Dashboard"
            >
              <Shield size={20} className="text-amber-400" />
            </button>
          )}
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full hover:bg-[var(--color-surface-700)] transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 bg-[var(--color-surface-800)]">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search users or chats..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full bg-[var(--color-surface-900)] border-none text-sm text-[var(--color-text-primary)] rounded-lg pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
          />
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isSearching ? (
          <div className="py-2">
            <h3 className="px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Global Search Result</h3>
            {searchResults.length > 0 ? (
              searchResults.map(resultUser => (
                <div 
                  key={resultUser._id} 
                  onClick={() => handleStartChat(resultUser)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-700)] cursor-pointer transition-colors"
                >
                  <div className="relative">
                     <div className="w-12 h-12 rounded-full bg-[var(--color-surface-600)] flex items-center justify-center flex-shrink-0">
                       {resultUser.avatar ? (
                         <img src={resultUser.avatar} className="w-full h-full rounded-full object-cover" />
                       ) : (
                         <span className="font-bold">{resultUser.username.charAt(0).toUpperCase()}</span>
                       )}
                     </div>
                     {resultUser.isOnline && (
                       <div className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--color-success)] border-2 border-[var(--color-surface-800)] rounded-full"></div>
                     )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[var(--color-text-primary)] truncate">{resultUser.username}</h4>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-[var(--color-text-secondary)] text-center">No users found.</p>
            )}
          </div>
        ) : (
          <div className="py-1">
            {chats.map(chat => {
              const isGroup = chat.isGroup;
              let name, avatar, isOnline;
              
              if (isGroup) {
                name = chat.groupId?.name || 'Group';
                avatar = chat.groupId?.avatar;
              } else {
                const other = chat.participants.find(p => p._id !== user._id);
                name = other?.username || 'Unknown';
                avatar = other?.avatar;
                isOnline = other?.isOnline;
              }

              const isPinned = user.pinnedChats?.includes(chat._id);
              const isSelected = selectedChat?._id === chat._id;

              return (
                <div 
                  key={chat._id} 
                  onClick={() => handleSelectChat(chat)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group
                    ${isSelected ? 'bg-[var(--color-surface-700)]' : 'hover:bg-[var(--color-surface-700)]/50'}
                  `}
                >
                  <div className="relative">
                     <div className="w-12 h-12 rounded-full bg-[var(--color-surface-600)] flex items-center justify-center flex-shrink-0 text-lg shadow-sm">
                       {avatar ? (
                         <img src={avatar} className="w-full h-full rounded-full object-cover" />
                       ) : (
                         <span className="font-bold">{name.charAt(0).toUpperCase()}</span>
                       )}
                     </div>
                     {!isGroup && isOnline && (
                       <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[var(--color-success)] border-2 border-[var(--color-surface-800)] rounded-full"></div>
                     )}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-medium text-[var(--color-text-primary)] truncate pr-2 flex items-center gap-1">
                         {name}
                         {isPinned && <Pin size={12} className="text-[var(--color-text-muted)] rotate-45" />}
                      </h4>
                      <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap flex-shrink-0">
                        {formatTime(chat.lastMessage?.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-[var(--color-text-secondary)] truncate">
                        {chat.lastMessage?.text || 'No messages yet'}
                      </p>
                      
                      {/* Optional Context Menu Trigger on Hover */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); togglePin(chat._id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-white transition-all focus:outline-none"
                      >
                         <Pin size={14} className={isPinned ? 'text-primary' : ''} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {chats.length === 0 && (
              <div className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                <p>No chats yet. Search for a user to start messaging.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isGroupModalOpen && (
        <CreateGroupModal onClose={() => setIsGroupModalOpen(false)} />
      )}
    </div>
  );
}
