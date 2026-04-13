import { useState } from 'react';
import { X, Search } from 'lucide-react';
import api from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import toast from 'react-hot-toast';
import { useChatStore } from '../../context/ChatContext';

export default function CreateGroupModal({ onClose }) {
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { createGroup } = useChatStore();

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length > 1) {
      try {
        const { data } = await api.get(`/users/search?q=${query}`);
        setSearchResults(data.users);
      } catch (error) {
        console.error('Search failed', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const toggleMember = (user) => {
    const isSelected = selectedMembers.some(m => m._id === user._id);
    if (isSelected) {
      setSelectedMembers(prev => prev.filter(m => m._id !== user._id));
    } else {
      setSelectedMembers(prev => [...prev, user]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Group name required');
    if (selectedMembers.length === 0) return toast.error('Select at least one member');

    setLoading(true);
    try {
      await createGroup({
        name,
        memberIds: selectedMembers.map(m => m._id)
      });
      toast.success('Group created');
      onClose();
    } catch (error) {
      toast.error('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[var(--color-surface-800)] w-full max-w-md rounded-2xl shadow-glass border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create Group</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            <Input
              label="Group Name"
              placeholder="e.g. Weekend Plan"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            
            <div className="space-y-3">
              <label className="block tracking-wide text-[var(--color-text-secondary)] text-sm font-medium ml-1">Add Members</label>
              
              {/* Selected Members Chips */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedMembers.map(member => (
                    <div key={member._id} className="bg-[var(--color-primary-light)] border border-[var(--color-primary)]/30 text-white text-sm px-2.5 py-1 rounded-full flex items-center gap-1.5">
                       <span>{member.username}</span>
                       <button type="button" onClick={() => toggleMember(member)} className="text-[var(--color-text-secondary)] hover:text-white"><X size={14}/></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-[var(--color-text-muted)]" />
                <input 
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg pl-9 pr-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                />
              </div>

              {/* Results */}
              {searchQuery.length > 1 && (
                 <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-900)] divide-y divide-[var(--color-border)] mt-2">
                   {searchResults.length > 0 ? (
                     searchResults.map(user => (
                       <label key={user._id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[var(--color-surface-800)] transition-colors">
                         <input 
                           type="checkbox"
                           checked={selectedMembers.some(m => m._id === user._id)}
                           onChange={() => toggleMember(user)}
                           className="accent-[var(--color-primary)] w-4 h-4 rounded border-[var(--color-border)]"
                         />
                         <div className="w-8 h-8 rounded-full bg-[var(--color-surface-600)] flex items-center justify-center overflow-hidden">
                           {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <span className="text-xs font-bold">{user.username.charAt(0).toUpperCase()}</span>}
                         </div>
                         <span className="text-sm font-medium">{user.username}</span>
                       </label>
                     ))
                   ) : (
                     <div className="px-3 py-4 text-center text-sm text-[var(--color-text-secondary)]">No users found</div>
                   )}
                 </div>
              )}
            </div>
          </div>
          
          <div className="p-4 border-t border-[var(--color-border)] flex justify-end gap-3 bg-[var(--color-surface-900)]">
             <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
             <Button type="submit" isLoading={loading}>Create Group</Button>
          </div>
        </form>

      </div>
    </div>
  );
}
