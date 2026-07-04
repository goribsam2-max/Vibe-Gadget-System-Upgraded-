import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Users, Phone, Mic, MicOff, MessageSquare, X, Send, Link as LinkIcon, MousePointer2 } from 'lucide-react';
import { useNotify } from './Notifications';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const LiveCoShopping = () => {
  const [isActive, setIsActive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [messages, setMessages] = useState<{senderId: string, senderName: string, text: string}[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [friends, setFriends] = useState<{id: string, name: string, scrollY: number}[]>([]);
  
  const location = useLocation();
  const notify = useNotify();
  const searchParams = new URLSearchParams(location.search);
  const isSession = searchParams.get('session');
  
  const myIdRef = useRef(Math.random().toString(36).substring(7));
  const sessionIdRef = useRef(isSession || '');
  
  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isSession) {
      setIsActive(true);
      setIsOpen(true);
      joinSession(isSession);
    }
  }, [isSession]);

  const joinSession = async (id: string) => {
    sessionIdRef.current = id;
    const docRef = doc(db, 'co_shopping_sessions', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, { messages: [], users: {} });
    }
    
    // Add myself
    await updateDoc(docRef, {
      [`users.${myIdRef.current}`]: { name: isSession ? 'Friend' : 'Host', scrollY: window.scrollY, lastActive: Date.now() }
    });

    // Listen to changes
    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMessages(data.messages || []);
        
        const otherUsers = Object.entries(data.users || {})
          .filter(([uid]) => uid !== myIdRef.current)
          .map(([uid, val]: [string, any]) => ({ id: uid, name: val.name, scrollY: val.scrollY || 0 }));
          
        setFriends(otherUsers);
      }
    });

    // Sync my scroll
    const handleScroll = () => {
      updateDoc(docRef, {
        [`users.${myIdRef.current}.scrollY`]: window.scrollY
      });
    };
    
    let scrollTimeout: any;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        handleScroll();
        scrollTimeout = null;
      }, 500);
    });
  };

  const handleInvite = async () => {
    const newSessionId = Math.random().toString(36).substring(7);
    sessionIdRef.current = newSessionId;
    const url = window.location.origin + window.location.pathname + '?session=' + newSessionId;
    navigator.clipboard.writeText(url);
    notify('Invite link copied! Send it to your friend.', 'success');
    setIsActive(true);
    setIsOpen(true);
    
    const docRef = doc(db, 'co_shopping_sessions', newSessionId);
    await setDoc(docRef, { messages: [], users: {} });
    joinSession(newSessionId);
  };

  const sendMessage = async () => {
    if (!inputMsg.trim() || !sessionIdRef.current) return;
    
    const docRef = doc(db, 'co_shopping_sessions', sessionIdRef.current);
    await updateDoc(docRef, {
      messages: arrayUnion({ senderId: myIdRef.current, senderName: isSession ? 'Friend' : 'You', text: inputMsg })
    });
    
    setInputMsg('');
  };

  const toggleMic = async () => {
    if (!sessionIdRef.current) return;

    if (isMuted) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setIsMuted(false);

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }]
        });
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          const remoteAudio = new Audio();
          remoteAudio.srcObject = event.streams[0];
          remoteAudio.play().catch(e => console.error("Audio play error", e));
        };

        const callDocRef = doc(db, 'co_shopping_sessions', sessionIdRef.current, 'calls', 'voice');
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            addDoc(collection(db, 'co_shopping_sessions', sessionIdRef.current, 'calls', 'voice', 'candidates'), {
              candidate: event.candidate.toJSON(),
              sender: myIdRef.current
            });
          }
        };

        if (!isSession) {
          // Host creates offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await setDoc(callDocRef, { offer: { type: offer.type, sdp: offer.sdp } });
          
          onSnapshot(callDocRef, (snap) => {
            const data = snap.data();
            if (data?.answer && !pc.currentRemoteDescription) {
              const rtcAnswer = new RTCSessionDescription(data.answer);
              pc.setRemoteDescription(rtcAnswer).catch(console.error);
            }
          });
        } else {
          // Friend answers
          const snap = await getDoc(callDocRef);
          const data = snap.data();
          if (data?.offer) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await updateDoc(callDocRef, { answer: { type: answer.type, sdp: answer.sdp } });
          } else {
            // Wait for offer
            onSnapshot(callDocRef, async (s) => {
              const d = s.data();
              if (d?.offer && !pc.currentRemoteDescription) {
                await pc.setRemoteDescription(new RTCSessionDescription(d.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await updateDoc(callDocRef, { answer: { type: answer.type, sdp: answer.sdp } });
              }
            });
          }
        }

        onSnapshot(collection(db, 'co_shopping_sessions', sessionIdRef.current, 'calls', 'voice', 'candidates'), (snap) => {
          snap.docChanges().forEach(change => {
            if (change.type === 'added') {
              const data = change.doc.data();
              if (data.sender !== myIdRef.current) {
                pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
              }
            }
          });
        });
      } catch (err) {
        console.error("Mic error:", err);
        notify("Microphone access denied or error.", "error");
      }
    } else {
      // Mute
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
      pcRef.current = null;
      setIsMuted(true);
    }
  };

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  }, []);

  if (!isActive && !isSession) {
    return (
      <div className="fixed bottom-24 right-4 z-[90]">
        <button 
          onClick={handleInvite}
          className="bg-black dark:bg-white text-white dark:text-black p-3 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Users className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Show friend scroll indicator (just a simulated cursor on the side) */}
      {friends.map(f => (
        <motion.div
          key={f.id}
          animate={{ y: f.scrollY - window.scrollY + (window.innerHeight / 2) }}
          transition={{ type: 'spring', stiffness: 50 }}
          className="fixed right-2 z-[80] pointer-events-none flex items-center gap-1 opacity-70"
        >
          <div className="bg-[#1cdb5e] text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-md whitespace-nowrap">
            {f.name} looking here
          </div>
          <MousePointer2 className="w-4 h-4 text-[#1cdb5e] fill-[#1cdb5e]" />
        </motion.div>
      ))}

      <div className="fixed bottom-24 right-4 z-[90] flex flex-col items-end pointer-events-none">
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 w-72 rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 mb-4 overflow-hidden flex flex-col pointer-events-auto"
            >
              <div className="bg-zinc-100 dark:bg-zinc-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1cdb5e] to-emerald-400 flex items-center justify-center text-white font-bold text-xs">
                    {friends.length > 0 ? friends[0].name.charAt(0) : '...'}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-none">Co-Shopping</p>
                    <p className="text-[9px] text-[#1cdb5e] font-bold">
                      {friends.length > 0 ? 'Friend is online' : 'Waiting for friend...'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={toggleMic} className={`p-2 rounded-full ${isMuted ? 'bg-white dark:bg-zinc-700' : 'bg-red-100 text-red-500'}`}>
                    {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-2 rounded-full bg-white dark:bg-zinc-700"><X className="w-3 h-3" /></button>
                </div>
              </div>

              <div className="flex-1 h-48 overflow-y-auto p-4 space-y-3 bg-white dark:bg-zinc-900 flex flex-col justify-end">
                {messages.length === 0 && (
                  <div className="text-center text-zinc-400 text-xs italic my-auto">
                    Start chatting with your friend!
                  </div>
                )}
                {messages.map((m, i) => {
                  const isMe = m.senderId === myIdRef.current;
                  return (
                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`px-3 py-2 rounded-2xl text-xs max-w-[80%] ${isMe ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-sm' : 'bg-zinc-100 dark:bg-zinc-800 rounded-tl-sm'}`}>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-2">
                <input 
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Message friend..." 
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 text-xs outline-none"
                />
                <button onClick={sendMessage} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-full"><Send className="w-3 h-3" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 pointer-events-auto">
          {!isOpen && (
            <button 
              onClick={() => setIsOpen(true)}
              className="bg-black dark:bg-white text-white dark:text-black px-4 py-3 rounded-full shadow-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              <Users className="w-4 h-4 text-[#1cdb5e]" />
              <span className="text-xs font-bold">Co-Shopping</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default LiveCoShopping;
