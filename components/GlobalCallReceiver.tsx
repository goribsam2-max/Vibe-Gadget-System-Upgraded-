import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, Volume2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { audioHelper } from '../lib/AudioHelper';

export const GlobalCallReceiver: React.FC = () => {
  const [myId, setMyId] = useState<string>('');
  const [incomingCall, setIncomingCall] = useState<{
    id: string;
    type: 'audio' | 'video';
    dept: string;
    callerName: string;
    callerAvatar: string;
  } | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyId(user.uid);
      } else {
        let gid = localStorage.getItem('vg_guest_id');
        if (!gid) {
          gid = 'guest_' + Math.random().toString(36).substring(2, 9);
          localStorage.setItem('vg_guest_id', gid);
        }
        setMyId(gid);
      }
    });
    return () => unsub();
  }, []);

  // Update presence on site
  useEffect(() => {
    if (!myId) return;
    const updatePresence = async () => {
      try {
        await setDoc(doc(db, 'helpline_presence', myId), {
          status: 'online',
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {
        console.error('Failed to update presence', e);
      }
    };
    updatePresence();
    const interval = setInterval(updatePresence, 5000);
    return () => clearInterval(interval);
  }, [myId]);

  useEffect(() => {
    if (!myId) return;
    if (window.location.pathname === '/help-center') return;
    
    const departments = ['general', 'tech', 'sales'];
    const unsubs = departments.map(dept => {
      const callId = `${myId}_${dept}`;
      return onSnapshot(doc(db, 'helpline_calls', callId), (snap) => {
        const data = snap.data();
        if (!data) return;

        if (data.callerId === 'admin') {
          if (data.status === 'calling') {
            // User is active on site! Change status to ringing so admin's sound shifts and user gets notified.
            updateDoc(doc(db, 'helpline_calls', callId), { status: 'ringing' }).catch(console.error);
          } else if (data.status === 'ringing') {
            setIncomingCall({
              id: callId,
              type: data.type || 'audio',
              dept,
              callerName: 'Vibe Gadget Support',
              callerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + dept
            });
            audioHelper.playRingtone();
          } else if (data.status === 'ended') {
            if (incomingCall) {
              audioHelper.playEndBip();
            }
            setIncomingCall(null);
            audioHelper.stop();
          }
        }
      });
    });
    
    return () => {
      unsubs.forEach(unsub => unsub());
      audioHelper.stop();
    };
  }, [myId, incomingCall?.id]);

  const declineCall = async () => {
    audioHelper.playEndBip();
    if (incomingCall) {
      await updateDoc(doc(db, 'helpline_calls', incomingCall.id), {
        status: 'ended'
      }).catch(console.error);
      
      const docRef = doc(db, 'helpline_chats', incomingCall.id);
      await updateDoc(docRef, {
        messages: arrayUnion({
          senderId: 'system',
          text: 'Incoming Call Declined',
          isSystem: true,
          systemType: 'call_declined',
          timestamp: Date.now()
        })
      }).catch(console.error);
    }
    setIncomingCall(null);
  };

  const acceptCall = async () => {
    audioHelper.stop();
    if (incomingCall) {
      await updateDoc(doc(db, 'helpline_calls', incomingCall.id), {
        status: 'accepted'
      }).catch(console.error);
      
      navigate(`/help-center?dept=${incomingCall.dept}&accept_call=true`);
    }
    setIncomingCall(null);
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-zinc-950/95 backdrop-blur-md text-white flex flex-col items-center justify-center p-6"
        >
          <div className="flex flex-col items-center max-w-sm w-full text-center">
            {/* Soft pulsing halo */}
            <div className="relative mb-8">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl"
              />
              <img 
                src={incomingCall.callerAvatar} 
                alt="Vibe Gadget" 
                className="w-28 h-28 rounded-full border-4 border-zinc-800/80 shadow-2xl relative z-10"
              />
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2.5 rounded-full border-4 border-zinc-950 z-20 shadow-lg">
                {incomingCall.type === 'video' ? <Video className="w-5 h-5 text-white" /> : <Phone className="w-5 h-5 text-white" />}
              </div>
            </div>

            <h2 className="text-3xl font-black tracking-tight text-white mb-2">Vibe Gadget</h2>
            <p className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-1 flex items-center gap-1.5 justify-center">
              <Volume2 className="w-4 h-4 animate-bounce" />
              Incoming Support Call
            </p>
            <p className="text-zinc-400 text-sm font-medium mb-16 capitalize">
              {incomingCall.dept} Department
            </p>

            <div className="flex justify-around w-full max-w-xs gap-8">
              {/* Decline Button (Size normalized to match standard control buttons) */}
              <button 
                onClick={declineCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg shadow-red-600/30 transition-transform active:scale-95"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>

              {/* Accept Button */}
              <button 
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/40 transition-transform active:scale-95 animate-pulse"
              >
                <Phone className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
