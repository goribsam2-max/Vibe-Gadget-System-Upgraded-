const fs = require('fs');
let code = fs.readFileSync('pages/admin/ManageVGHelpline.tsx', 'utf8');

const webrtcLogic = `  const acceptCall = async () => {
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
  };`;

// replace acceptCall method
code = code.replace(/const acceptCall = async \(\) => \{[\s\S]*?declineCall\(\);\n    \}\n  \};/m, webrtcLogic);
fs.writeFileSync('pages/admin/ManageVGHelpline.tsx', code);
