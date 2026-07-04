const fs = require('fs');
let code = fs.readFileSync('pages/HelpCenter.tsx', 'utf8');

const webrtcSetup = `  const setupWebRTC = async (stream: MediaStream, type: 'audio' | 'video', isCaller: boolean) => {
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
  };`;

// Replace from const setupWebRTC = ... to // For this helpline simulation, we just show the local stream working
// and the closing brace
code = code.replace(/const setupWebRTC = \([\s\S]*?working\s*  };/m, webrtcSetup);
fs.writeFileSync('pages/HelpCenter.tsx', code);
