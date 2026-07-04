import React, { useState, useEffect } from 'react';
import { Users, Clock, Share2 } from 'lucide-react';
import { useNotify } from './Notifications';

export const LiveGroupBuy = ({ product, onJoinGroup }: { product: any, onJoinGroup: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [joined, setJoined] = useState(1);
  const [hasJoined, setHasJoined] = useState(false);
  const totalNeeded = 3;
  const notify = useNotify();

  useEffect(() => {
    const storageKey = `groupbuy_${product.id}`;
    const alreadyJoined = localStorage.getItem(storageKey);
    
    const searchParams = new URLSearchParams(window.location.search);
    const hasGroupBuyParam = searchParams.get('groupbuy');

    if (alreadyJoined) {
      setHasJoined(true);
      setJoined(2);
    } else if (hasGroupBuyParam) {
      setJoined(2);
      setHasJoined(true);
      localStorage.setItem(storageKey, 'true');
      notify('You joined a Group Buy from a link!', 'success');
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [product.id, notify]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const discountAmount = product.price * 0.05; // 5% discount for group buy
  const groupPrice = product.price - discountAmount;

  const handleShare = () => {
    const url = window.location.origin + window.location.pathname + '?groupbuy=true';
    navigator.clipboard.writeText(url);
    notify('Group Buy link copied! Share with friends.', 'success');
  };

  const handleJoinClick = () => {
    if (!hasJoined) {
      setJoined(prev => Math.min(prev + 1, totalNeeded));
      setHasJoined(true);
      localStorage.setItem(`groupbuy_${product.id}`, 'true');
      onJoinGroup();
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#1cdb5e]/10 to-[#1cdb5e]/5 rounded-[2rem] border border-[#1cdb5e]/20 p-5 mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#1cdb5e]/10 rounded-full blur-3xl -mr-10 -mt-10" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-[#1cdb5e] font-bold text-xs uppercase tracking-widest mb-1">
            Live Group Buy
          </div>
          <h3 className="text-lg font-black text-zinc-900 dark:text-white">Buy together, save more!</h3>
        </div>
        <div className="bg-white dark:bg-zinc-900 text-red-500 font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm text-xs">
          <Clock className="w-3.5 h-3.5" /> {formatTime(timeLeft)}
        </div>
      </div>

      <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20 dark:border-zinc-800 relative z-10">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wide">Group Price</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1cdb5e]">৳{groupPrice.toLocaleString()}</span>
              <span className="text-sm text-zinc-400 line-through font-semibold">৳{product.price}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Buyers needed</p>
            <div className="flex gap-1 justify-end">
              {[...Array(totalNeeded)].map((_, i) => (
                <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < joined ? 'bg-[#1cdb5e] text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                  {i < joined ? '✓' : '?'}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 mb-2 overflow-hidden">
          <div className="bg-[#1cdb5e] h-full transition-all" style={{ width: `${(joined / totalNeeded) * 100}%` }} />
        </div>
        <p className="text-xs text-zinc-500 text-center font-medium">Only {totalNeeded - joined} more buyer{totalNeeded - joined > 1 ? 's' : ''} needed to activate deal!</p>
      </div>

      <div className="flex gap-2 relative z-10">
        <button 
          onClick={handleShare}
          className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button 
          onClick={handleJoinClick}
          disabled={hasJoined}
          className={`flex-1 font-bold rounded-xl flex items-center justify-center gap-2 transition-transform shadow-xl shadow-zinc-900/10 ${hasJoined ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-[1.02]'}`}
        >
          <Users className="w-4 h-4" /> {hasJoined ? 'Joined' : 'Join Group Buy'}
        </button>
      </div>
    </div>
  );
};
