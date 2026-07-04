const fs = require('fs');
let code = fs.readFileSync('pages/HelpCenter.tsx', 'utf8');

// add showControls and callDuration state
code = code.replace(/const \[isSpeaker, setIsSpeaker\] = useState\(false\);/, "const [isSpeaker, setIsSpeaker] = useState(false);\n  const [showControls, setShowControls] = useState(true);\n  const [callDuration, setCallDuration] = useState(0);\n  const timerRef = useRef<any>(null);");

// add callDuration effect
const callDurEffect = `
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
    return \`\${m}:\${s < 10 ? '0' : ''}\${s}\`;
  };
`;
code = code.replace(/const myId =/, callDurEffect + "\n  const myId =");

// update call UI
code = code.replace(/<motion\.div\s*initial=\{\{ opacity: 0 \}\}\s*animate=\{\{ opacity: 1 \}\}\s*exit=\{\{ opacity: 0 \}\}\s*className="absolute inset-0 bg-black\/95 z-50 flex flex-col"\s*>/m, 
`<motion.div 
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={() => setShowControls(p => !p)}
  className="absolute inset-0 bg-black/95 z-50 flex flex-col"
>`);

// conditionally hide call header and controls if !showControls and callState === 'active'
code = code.replace(/\{\/\* Call Header \*\/\}[\s\S]*?<\/div>/, 
`{/* Call Header */}
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
</AnimatePresence>`);

code = code.replace(/\{\/\* Controls \*\/\}[\s\S]*?<\/div>\s*<\/motion\.div>/, 
`{/* Controls */}
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
          <button onClick={toggleMute} className={\`w-14 h-14 rounded-full flex items-center justify-center transition-colors \${isMuted ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}\`}>
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button onClick={() => setIsSpeaker(!isSpeaker)} className={\`w-14 h-14 rounded-full flex items-center justify-center transition-colors \${isSpeaker ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}\`}>
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
</motion.div>`);

fs.writeFileSync('pages/HelpCenter.tsx', code);
