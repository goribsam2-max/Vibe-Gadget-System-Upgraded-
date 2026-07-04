import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video, Paperclip, Send, X, PhoneOff, Mic, MicOff, Volume2, Image as ImageIcon, CheckCheck, Clock } from 'lucide-react';
import SEO from '../components/SEO';

import { useNotify } from '../components/Notifications';
import { db, auth } from '../firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, collection, addDoc, getDoc } from 'firebase/firestore';

const DEPARTMENTS = [
  { id: 'general', name: 'General Support', status: 'Online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=General' },
  { id: 'tech', name: 'Technical Support', status: 'Online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tech' },
  { id: 'sales', name: 'Sales & Billing', status: 'Offline', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sales' },
];

const HelpCenter: React.FC = () => {
  const user = auth.currentUser;
  const notify = useNotify();
  const [activeChat, setActiveChat] = useState(DEPARTMENTS[0]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Call states
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'active'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const formatCallDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const myId = user?.uid || 'guest_' + Math.random().toString(36).substring(7);
  const chatId = `${myId}_${activeChat.id}`;

  useEffect(() => {
    if ('Notification' in window) Notification.requestPermission();
  }, []);

  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  useEffect(() => {
    const docRef = doc(db, 'helpline_chats', chatId);
    
    const initChat = async () => {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, { messages: [] });
      }
    };
    initChat();

    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const newMessages = data.messages || [];
        
        // Check for new messages from agent to notify
        if (newMessages.length > messages.length && messages.length > 0) {
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.senderId !== myId) {
            showNotification(`New message from ${activeChat.name}`, lastMsg.text || 'Sent an attachment');
          }
        }
        
        setMessages(newMessages);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });

    // Listen for incoming calls
    const callRef = doc(db, 'helpline_calls', chatId);
    const unsubCall = onSnapshot(callRef, (snap) => {
      const data = snap.data();
      if (data?.status === 'ringing' && data.callerId !== myId && callState === 'idle') {
        setCallType(data.type);
        setCallState('incoming');
        showNotification('Incoming Call', `Incoming ${data.type} call from ${activeChat.name}`);
      } else if (data?.status === 'ended' && callState !== 'idle') {
        endCallLocal();
        notify('Call ended', 'info');
      }
    });

    return () => {
      unsub();
      unsubCall();
    };
  }, [chatId, activeChat]);

  const sendMessage = async (text: string, imageUrl?: string) => {
    if ((!text.trim() && !imageUrl) || !chatId) return;
    
    const docRef = doc(db, 'helpline_chats', chatId);
    const newMsg = {
      senderId: myId,
      text: text.trim(),
      imageUrl: imageUrl || null,
      timestamp: Date.now()
    };
    
    await updateDoc(docRef, {
      messages: arrayUnion(newMsg)
    });
    
    setInputMsg('');
    
    // Simulate agent reply
    setTimeout(async () => {
      await updateDoc(docRef, {
        messages: arrayUnion({
          senderId: activeChat.id,
          text: `Thanks for reaching out to ${activeChat.name}. How can we help you today?`,
          timestamp: Date.now()
        })
      });
    }, 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      // Using a public API key for ImgBB (replace in production)
      const res = await fetch('https://api.imgbb.com/1/upload?key=648600c017bc76b0051e5e0a6d213898', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        await sendMessage('', data.data.url);
      } else {
        notify('Failed to upload image', 'error');
      }
    } catch (err) {
      console.error(err);
      notify('Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const startCall = async (type: 'audio' | 'video') => {
    setCallType(type);
    setCallState('calling');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      
      const callRef = doc(db, 'helpline_calls', chatId);
      await setDoc(callRef, {
        status: 'ringing',
        type,
        callerId: myId,
        timestamp: Date.now()
      });

      // Simulate answer after 3 seconds
      setTimeout(async () => {
        if (callState === 'calling' || true) {
          await setDoc(callRef, { status: 'active' }, { merge: true });
          setCallState('active');
          setupWebRTC(stream, type, true);
        }
      }, 3000);
      
    } catch (err) {
      console.error(err);
      notify('Microphone/Camera access denied', 'error');
      setCallState('idle');
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      
      const callRef = doc(db, 'helpline_calls', chatId);
      await setDoc(callRef, { status: 'active' }, { merge: true });
      setCallState('active');
      setupWebRTC(stream, callType, false);
      
    } catch (err) {
      console.error(err);
      notify('Microphone/Camera access denied', 'error');
      declineCall();
    }
  };

    const setupWebRTC = async (stream: MediaStream, type: 'audio' | 'video', isCaller: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    
    pc.ontrack = (event) => {
      if (type === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      } else {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play().catch(console.error);
      }
    };
    
    const callRef = doc(db, 'helpline_calls', chatId);
    const candidateRef = collection(db, 'helpline_calls', chatId, 'candidates');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(candidateRef, {
          candidate: event.candidate.toJSON(),
          sender: myId
        });
      }
    };

    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await updateDoc(callRef, { offer: { type: offer.type, sdp: offer.sdp } }, { merge: true });
      
      onSnapshot(callRef, (snap) => {
        const data = snap.data();
        if (data?.answer && !pc.currentRemoteDescription) {
          pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });
    } else {
      const snap = await getDoc(callRef);
      const data = snap.data();
      if (data?.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await updateDoc(callRef, { answer: { type: answer.type, sdp: answer.sdp } }, { merge: true });
      }
    }

    onSnapshot(candidateRef, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.sender !== myId) {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      });
    });
  };

  const declineCall = async () => {
    const callRef = doc(db, 'helpline_calls', chatId);
    await setDoc(callRef, { status: 'ended', timestamp: Date.now() }, { merge: true });
    endCallLocal();
  };

  const endCallLocal = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    setCallState('idle');
    setIsMuted(false);
    setIsSpeaker(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = isMuted);
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pt-20 pb-10">
      <SEO title="VG Helpline | Vibe Gadget" description="Live support and help center." />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-120px)]">
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-xl border border-zinc-200 dark:border-zinc-800 h-full flex overflow-hidden">
          
          {/* Left Sidebar - Chat List */}
          <div className="w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col hidden md:flex">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">VG Helpline</h2>
              <p className="text-xs text-zinc-500 font-medium mt-1">Live Support & Chat</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setActiveChat(dept)}
                  className={`w-full p-4 flex items-center gap-4 transition-colors ${activeChat.id === dept.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l-4 border-transparent'}`}
                >
                  <div className="relative">
                    <img src={dept.avatar} alt={dept.name} className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${dept.status === 'Online' ? 'bg-green-500' : 'bg-zinc-400'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className={`font-bold text-sm ${activeChat.id === dept.id ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{dept.name}</h3>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{dept.status === 'Online' ? 'Typically replies instantly' : 'Currently offline'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Area - Chat Window */}
          <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-black relative">
            {/* Chat Header */}
            <div className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <img src={activeChat.avatar} alt={activeChat.name} className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{activeChat.name}</h3>
                  <p className="text-xs text-green-500 font-semibold">{activeChat.status}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={() => startCall('audio')} disabled={activeChat.status !== 'Online' || callState !== 'idle'} className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50">
                  <Phone className="w-5 h-5" />
                </button>
                <button onClick={() => startCall('video')} disabled={activeChat.status !== 'Online' || callState !== 'idle'} className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50">
                  <Video className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")', backgroundBlendMode: 'overlay', opacity: 0.9 }}>
              <div className="text-center my-4">
                <span className="bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-sm">Today</span>
              </div>
              
              <div className="flex justify-start">
                <div className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 p-3 rounded-2xl rounded-tl-sm max-w-[75%] shadow-sm text-sm">
                  <p>Welcome to VG Helpline! I'm your assistant from {activeChat.name}. How can I help you today?</p>
                  <p className="text-[10px] text-zinc-400 text-right mt-1">{formatTime(Date.now())}</p>
                </div>
              </div>

              {messages.map((msg, i) => {
                const isMe = msg.senderId === myId;
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-2xl max-w-[75%] shadow-sm text-sm ${isMe ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-zinc-900 dark:text-white rounded-tr-sm' : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-sm'}`}>
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Attachment" className="max-w-full rounded-xl mb-2 cursor-pointer hover:opacity-90" onClick={() => window.open(msg.imageUrl, '_blank')} />
                      )}
                      {msg.text && <p>{msg.text}</p>}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={`text-[10px] ${isMe ? 'text-green-700 dark:text-green-200' : 'text-zinc-400'}`}>{formatTime(msg.timestamp)}</span>
                        {isMe && <CheckCheck className={`w-3 h-3 ${isMe ? 'text-blue-500' : 'text-zinc-400'}`} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-end gap-2">
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
              />
              <label htmlFor="file-upload" className={`p-3 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {isUploading ? <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-5 h-5" />}
              </label>
              
              <div className="flex-1 bg-white dark:bg-zinc-800 rounded-3xl min-h-[44px] flex items-center px-4 shadow-sm">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage(inputMsg)}
                  placeholder="Type a message..."
                  className="w-full bg-transparent border-none outline-none text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              
              <button 
                onClick={() => sendMessage(inputMsg)}
                disabled={!inputMsg.trim() && !isUploading}
                className="p-3 bg-[#00a884] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#008f6f] transition-colors disabled:opacity-50 disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </div>

            {/* Call Overlay */}
            <AnimatePresence>
              {callState !== 'idle' && (
                <motion.div 
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={() => setShowControls(p => !p)}
  className="absolute inset-0 bg-black/95 z-50 flex flex-col"
>
                  {/* Call Header */}
<AnimatePresence>
  {showControls && (
    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="p-8 text-center mt-10">
      <img src={activeChat.avatar} alt="Avatar" className="w-24 h-24 rounded-full mx-auto mb-4 bg-zinc-800 border-4 border-zinc-700" />
      <h2 className="text-2xl font-bold text-white">{activeChat.name}</h2>
      <p className="text-zinc-400 mt-2 font-mono">
        {callState === 'calling' && 'Calling...'}
        {callState === 'incoming' && 'Incoming Call...'}
        {callState === 'active' && formatCallDuration(callDuration)}
      </p>
    </motion.div>
  )}
</AnimatePresence>

                  {/* Video Area (if active video call) */}
                  {callState === 'active' && callType === 'video' && (
                    <div className="flex-1 relative p-4">
                      <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-3xl bg-zinc-900" />
                      <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-8 right-8 w-32 h-48 object-cover rounded-2xl border-2 border-zinc-700 bg-black" />
                    </div>
                  )}

                  {/* Controls */}
<AnimatePresence>
  {showControls && (
    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} onClick={e => e.stopPropagation()} className="mt-auto p-12 flex justify-center gap-6">
      {callState === 'incoming' ? (
        <>
          <button onClick={declineCall} className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-red-500/20">
            <PhoneOff className="w-6 h-6" />
          </button>
          <button onClick={acceptCall} className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-green-500/20 animate-bounce">
            <Phone className="w-6 h-6" />
          </button>
        </>
      ) : (
        <>
          <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button onClick={() => setIsSpeaker(!isSpeaker)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isSpeaker ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>
            <Volume2 className="w-6 h-6" />
          </button>
          <button onClick={declineCall} className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-red-500/20 ml-4">
            <PhoneOff className="w-7 h-7" />
          </button>
        </>
      )}
    </motion.div>
  )}
</AnimatePresence>
</motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
