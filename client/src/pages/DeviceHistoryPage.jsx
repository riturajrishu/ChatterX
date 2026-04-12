import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Monitor, Smartphone, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';
import Spinner from '../components/ui/Spinner';

export default function DeviceHistoryPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const { data } = await api.get('/users/devices');
      setDevices(data.devices);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.delete(`/users/devices/${id}`);
      setDevices(prev => prev.filter(d => d._id !== id));
      toast.success('Session record removed');
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-[var(--color-surface-900)] flex justify-center py-6 sm:py-10 px-4 pb-20">
      <div className="max-w-3xl w-full">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate('/settings')} className="p-2 bg-[var(--color-surface-800)] rounded-full hover:bg-[var(--color-surface-700)] transition-colors">
             <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-white">Device History</h1>
        </div>
        
        <p className="text-[var(--color-text-secondary)] mb-8 ml-[52px]">
          Review your recent logins. Records older than 30 days are automatically deleted. If you see unrecognized activity, you should change your password immediately.
        </p>

        <div className="bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
           {loading ? (
             <div className="py-20 flex justify-center"><Spinner /></div>
           ) : devices.length === 0 ? (
             <div className="py-20 text-center text-[var(--color-text-secondary)]">No records found.</div>
           ) : (
             <div className="divide-y divide-[var(--color-border-light)]">
               {devices.map((device, idx) => {
                 const isMobile = device.device === 'Mobile';
                 
                 return (
                   <div key={device._id} className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 hover:bg-[var(--color-surface-900)]/30 transition-colors">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-xl mt-1 sm:mt-0 ${idx === 0 ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'bg-[var(--color-surface-700)] text-[var(--color-text-muted)]'}`}>
                           {isMobile ? <Smartphone size={24}/> : <Monitor size={24}/>}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-[var(--color-text-primary)]">
                              {device.device} · {device.browser}
                            </h3>
                            {idx === 0 && (
                               <span className="text-[10px] uppercase tracking-wider font-bold bg-[var(--color-primary)] text-white px-2 py-0.5 rounded-full">Current</span>
                            )}
                          </div>
                          
                          <div className="text-sm text-[var(--color-text-secondary)] flex flex-col sm:flex-row sm:gap-4 gap-1">
                             <span>IP: {device.ip || 'Unknown'}</span>
                             <span className="hidden sm:inline">•</span>
                             <span className="text-[var(--color-text-muted)]">
                               {format(new Date(device.loginAt), 'MMM dd, yyyy - HH:mm')}
                             </span>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleRevoke(device._id)}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-danger/10 rounded-lg transition-colors shrink-0"
                        title="Remove record"
                      >
                         <Trash2 size={18} />
                      </button>
                   </div>
                 );
               })}
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
