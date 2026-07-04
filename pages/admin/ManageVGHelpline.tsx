import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { Phone, Video, Mic, MicOff, Volume2, PhoneOff, Send, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ManageVGHelpline: React.FC = () => {
  const [chats, setChats] = useState<{ id: string, messages: any[], lastActive: number }[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  
  // Call States
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'active'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'helpline_chats'), (snap) => {
      const chatList = snap.docs.map(d => {
        const msgs = d.data().messages || [];
        return {
          id: d.id,
          messages: msgs,
          lastActive: msgs.length > 0 ? msgs[msgs.length - 1].timestamp : 0
        };
      }).sort((a, b) => b.lastActive - a.lastActive);
      setChats(chatList);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedChat) return;
    const unsub = onSnapshot(doc(db, 'helpline_chats', selectedChat), (snap) => {
      if (snap.exists()) setMessages(snap.data().messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [selectedChat]);

  useEffect(() => {
    // Listen for calls across all chats
    const unsubCalls = onSnapshot(collection(db, 'helpline_calls'), (snap) => {
      let incomingCall = null;
      for (const d of snap.docs) {
        const data = d.data();
        if (data.status === 'ringing' && data.callerId !== 'admin') {
          incomingCall = { id: d.id, ...data };
          break;
        } else if (data.status === 'ended' && activeCallId === d.id) {
          endCallLocal();
        }
      }
      
      if (incomingCall && callState === 'idle') {
        setActiveCallId(incomingCall.id);
        setCallType(incomingCall.type);
        setCallState('ringing');
      }
    });
    
    return () => unsubCalls();
  }, [callState, activeCallId]);
  
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !selectedChat) return;
    
    await updateDoc(doc(db, 'helpline_chats', selectedChat), {
      messages: arrayUnion({
        senderId: 'admin',
        text: inputMsg.trim(),
        timestamp: Date.now()
      })
    });
    setInputMsg('');
  };

    const acceptCall = async () => {
    if (!activeCallId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      
      await setDoc(doc(db, 'helpline_calls', activeCallId), { status: 'active' }, { merge: true });
      setCallState('active');

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      pc.ontrack = (event) => {
        if (callType === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        } else {
          const audio = new Audio();
          audio.srcObject = event.streams[0];
          audio.play().catch(console.error);
        }
      };

      const callRef = doc(db, 'helpline_calls', activeCallId);
      const candidateRef = collection(db, 'helpline_calls', activeCallId, 'candidates');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(candidateRef, {
            candidate: event.candidate.toJSON(),
            sender: 'admin'
          });
        }
      };

      const snap = await getDoc(callRef);
      const data = snap.data();
      if (data?.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await updateDoc(callRef, { answer: { type: answer.type, sdp: answer.sdp } });
      }

      onSnapshot(candidateRef, (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.sender !== 'admin') {
              pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          }
        });
      });

    } catch (err) {
      console.error(err);
      declineCall();
    }
  };

  const declineCall = async () => {
    if (activeCallId) {
      await setDoc(doc(db, 'helpline_calls', activeCallId), { status: 'ended', timestamp: Date.now() }, { merge: true });
    }
    endCallLocal();
  };

  const endCallLocal = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    setCallState('idle');
    setActiveCallId(null);
    setIsMuted(false);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = isMuted);
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="h-[calc(100vh-80px)] flex relative">
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="font-bold text-lg">VG Helpline Chats</h2>
        </div>
        {chats.map(chat => (
          <div 
            key={chat.id}
            onClick={() => setSelectedChat(chat.id)}
            className={`p-4 border-b border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 ${selectedChat === chat.id ? 'bg-zinc-50 dark:bg-zinc-800' : ''}`}
          >
            <div className="font-semibold text-sm truncate">{chat.id.replace(/guest_/, 'Guest ')}</div>
            <div className="text-xs text-zinc-500 truncate">{chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : 'No messages'}</div>
          </div>
        ))}
      </div>
      
      <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-black">
        {selectedChat ? (
          <>
            <div className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold">{selectedChat.replace(/guest_/, 'Guest ')}</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-xl max-w-[70%] text-sm ${msg.senderId === 'admin' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'}`}>
                    {msg.imageUrl && <img src={msg.imageUrl} alt="" className="max-w-xs rounded-lg mb-2" />}
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input 
                  type="text"
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  placeholder="Type message to user..."
                  className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg outline-none text-sm"
                />
                <button type="submit" disabled={!inputMsg.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <p>Select a chat to view</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {callState !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowControls(p => !p)}
            className="fixed inset-0 z-[100] bg-black text-white flex flex-col"
          >
            {callState === 'ringing' ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-indigo-600/20 flex items-center justify-center mb-8 animate-pulse">
                  <Phone className="w-12 h-12 text-indigo-500" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Incoming Call</h2>
                <p className="text-zinc-400 mb-12">User is calling...</p>
                <div className="flex gap-8">
                  <button onClick={(e) => { e.stopPropagation(); declineCall(); }} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:scale-105 transition-transform">
                    <PhoneOff className="w-8 h-8" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); acceptCall(); }} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:scale-105 transition-transform">
                    <Phone className="w-8 h-8" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 relative">
                {callType === 'video' ? (
                  <>
                    {/* Remote Video Full Screen */}
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    {/* Local Video Small */}
                    <video ref={localVideoRef} autoPlay playsInline muted className="absolute top-8 right-8 w-32 h-48 bg-zinc-900 border-2 border-white/20 rounded-2xl object-cover shadow-2xl" />
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                    <div className="w-32 h-32 rounded-full bg-indigo-600 flex items-center justify-center mb-8">
                      <Phone className="w-12 h-12" />
                    </div>
                    <div className="text-2xl font-bold mb-2">Voice Call Active</div>
                    <div className="text-zinc-400 font-mono">{formatTime(callDuration)}</div>
                  </div>
                )}
                
                <AnimatePresence>
                  {showControls && (
                    <motion.div 
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 100, opacity: 0 }}
                      onClick={e => e.stopPropagation()}
                      className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl px-8 py-4 rounded-full flex gap-6 items-center shadow-2xl border border-white/10"
                    >
                      <div className="text-white font-mono mr-4">{formatTime(callDuration)}</div>
                      <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>
                      <button onClick={() => setIsSpeaker(!isSpeaker)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isSpeaker ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>
                        <Volume2 className="w-5 h-5" />
                      </button>
                      <button onClick={declineCall} className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
                        <PhoneOff className="w-5 h-5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageVGHelpline;
