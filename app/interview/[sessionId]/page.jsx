'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SilkVoicePlayer } from '@/lib/silkPlayer';
import { DeepgramLiveTranscriber } from '@/lib/deepgramLive';

const STATUS_LABEL = {
  loading:   'Preparing…',
  speaking:  'Speaking',
  listening: 'Listening',
  thinking:  'Thinking',
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

function initialsFor(role) {
  return role.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function labelFor(device, idx, kind) {
  if (device.label) return device.label;
  return kind === 'videoinput' ? `Camera ${idx + 1}` : `Microphone ${idx + 1}`;
}

function VoiceOrb({ active }) {
  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      {active && (
        <>
          <span className="absolute inset-0 rounded-full bg-[#F0B96B]/20 animate-ping" />
          <span className="absolute inset-4 rounded-full bg-[#F0B96B]/30 animate-ping [animation-delay:200ms]" />
        </>
      )}
      <div
        className={`relative w-32 h-32 rounded-full transition-transform duration-500 ${active ? 'scale-105' : 'scale-100'}`}
        style={{
          background:
            'radial-gradient(circle at 30% 30%, #FEF9EC 0%, #F0B96B 35%, #A8612C 75%, #4A2810 100%)',
          boxShadow: active
            ? '0 0 60px 8px rgba(240, 185, 107, 0.35), inset 0 -8px 24px rgba(0,0,0,0.4)'
            : '0 0 24px 2px rgba(240, 185, 107, 0.15), inset 0 -8px 24px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
}

function IconMic({ muted }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
      {muted && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" />}
    </svg>
  );
}

function IconCam({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      {off && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" />}
    </svg>
  );
}

function IconReplay() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function IconEnd() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" transform="rotate(135 12 12)" />
    </svg>
  );
}

function IconChevronUp() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function DeviceMenu({ kind, label, devices, selectedId, onSelect, onRequest, needsPermission, error }) {
  return (
    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 min-w-[280px] max-w-[360px] bg-[#1C1917] border border-[#3D3733] rounded-xl shadow-2xl py-1.5 z-50">
      <div className="px-3 py-2 text-[9px] tracking-widest uppercase text-[#78716C] font-semibold border-b border-[#2A2622]">
        Select {label}
      </div>
      {error && (
        <div className="px-3 py-2 text-[11px] text-rose-400">{error}</div>
      )}
      {needsPermission && (
        <button
          onClick={onRequest}
          className="w-full text-left px-3 py-2.5 text-xs text-[#F0B96B] hover:bg-[#2A2622] transition-colors border-b border-[#2A2622]"
        >
          Grant {label.toLowerCase()} access to see device names
        </button>
      )}
      {devices.length === 0 && !needsPermission && (
        <div className="px-3 py-2.5 text-xs text-[#78716C]">No devices found</div>
      )}
      {devices.map((d, idx) => {
        const selected = d.deviceId === selectedId;
        return (
          <button
            key={d.deviceId || idx}
            onClick={() => onSelect(d.deviceId)}
            className="w-full text-left px-3 py-2.5 text-xs hover:bg-[#2A2622] transition-colors flex items-center gap-2.5"
          >
            <span className={`flex-shrink-0 w-3 h-3 rounded-full flex items-center justify-center ${
              selected ? 'bg-[#F0B96B]' : 'border border-[#3D3733]'
            }`}>
              {selected && (
                <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="#0F0D0B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className={`truncate ${selected ? 'text-[#FEF9EC] font-medium' : 'text-[#A89F92]'}`}>
              {labelFor(d, idx, kind)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function InterviewPage({ params }) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [error, setError]     = useState('');

  const [status, setStatus]                   = useState('loading');
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [audioError, setAudioError]           = useState('');

  const [camOn, setCamOn]       = useState(true);
  const [camError, setCamError] = useState('');
  const [micError, setMicError] = useState('');
  const [micMuted, setMicMuted] = useState(true);

  const [recording, setRecording]         = useState(false);
  const [transcribing, setTranscribing]   = useState(false);
  const [transcript, setTranscript]       = useState('');
  const [interimText, setInterimText]     = useState(''); // live, while recording
  const [transcriptError, setTranscriptError] = useState('');
  const [completed, setCompleted]         = useState(false);

  const [typeMode, setTypeMode]     = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');

  const [videoDevices, setVideoDevices]   = useState([]);
  const [audioDevices, setAudioDevices]   = useState([]);
  const [selectedCamId, setSelectedCamId] = useState(undefined);
  const [selectedMicId, setSelectedMicId] = useState(undefined);
  const [micPermission, setMicPermission] = useState(false);

  const [camMenuOpen, setCamMenuOpen] = useState(false);
  const [micMenuOpen, setMicMenuOpen] = useState(false);

  const [elapsed, setElapsed] = useState(0);

  const playerRef        = useRef(null);
  const videoRef         = useRef(null);
  const streamRef        = useRef(null);
  const camWrapRef       = useRef(null);
  const micWrapRef       = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef   = useRef(null);
  const recordedChunksRef = useRef([]);
  const transcriberRef   = useRef(null);
  const completedRef     = useRef(false); // mirrors `completed`, readable from stale closures

  if (!playerRef.current && typeof window !== 'undefined') {
    playerRef.current = new SilkVoicePlayer();
  }

  // Keep completedRef in sync so closures captured before completion fires can still see the latest value.
  useEffect(() => { completedRef.current = completed; }, [completed]);

  // Restore persisted device choices on mount
  useEffect(() => {
    try {
      const cam = localStorage.getItem('silkhr.camId');
      const mic = localStorage.getItem('silkhr.micId');
      if (cam) setSelectedCamId(cam);
      if (mic) setSelectedMicId(mic);
    } catch {}
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devs.filter((d) => d.kind === 'videoinput'));
      setAudioDevices(devs.filter((d) => d.kind === 'audioinput'));
    } catch (e) {
      console.warn('enumerateDevices failed', e);
    }
  }, []);

  // Load session
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/session/${sessionId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load session');
        if (!cancelled) setSession(data);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [sessionId]);

  // Session timer
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [session]);

  // Forward declaration via ref so playVoice can be called from submitAnswer below.
  const playVoiceRef = useRef(null);

  // Auto-play voice when session first loads. Subsequent questions are kicked
  // off from submitAnswer using the voice payload returned by /api/answer.
  useEffect(() => {
    if (!session) return;
    playVoiceRef.current?.(null); // null = fetch fresh voice for current index
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.sessionId]);

  // Webcam stream lifecycle. Re-fires when camOn or selectedCamId changes.
  useEffect(() => {
    if (!camOn) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      return;
    }

    let cancelled = false;

    const constraints = {
      video: selectedCamId
        ? { deviceId: { exact: selectedCamId } }
        : { width: 640, height: 480 },
      audio: false,
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        // Replace previous stream
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamError('');
        refreshDevices();

        // If we don't have a stored choice, remember what got picked
        if (!selectedCamId) {
          const id = stream.getVideoTracks()[0]?.getSettings?.()?.deviceId;
          if (id) setSelectedCamId(id);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // If a stored deviceId no longer exists, fall back to default
        if (selectedCamId && /not.*found|OverconstrainedError|NotFoundError/i.test(err?.name + ' ' + err?.message)) {
          setSelectedCamId(undefined);
          try { localStorage.removeItem('silkhr.camId'); } catch {}
          return;
        }
        setCamError(err?.message || 'Camera unavailable');
        setCamOn(false);
      });

    return () => { cancelled = true; };
  }, [camOn, selectedCamId, refreshDevices]);

  // devicechange listener
  useEffect(() => {
    if (!navigator.mediaDevices) return;
    const onChange = () => refreshDevices();
    navigator.mediaDevices.addEventListener('devicechange', onChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', onChange);
  }, [refreshDevices]);

  // Close menus on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (camWrapRef.current && !camWrapRef.current.contains(e.target)) setCamMenuOpen(false);
      if (micWrapRef.current && !micWrapRef.current.contains(e.target)) setMicMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Cleanup webcam + mic + transcriber + Silk player on unmount
  useEffect(() => () => {
    if (streamRef.current)      streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach((t) => t.stop());
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (transcriberRef.current) {
      // Fire-and-forget; we're unmounting
      transcriberRef.current.stop().catch(() => {});
    }
    if (playerRef.current) playerRef.current.dispose();
  }, []);

  const requestMicPermission = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      setMicPermission(true);
      setMicError('');
      await refreshDevices();
    } catch (err) {
      setMicError(err?.message || 'Microphone unavailable');
    }
  }, [refreshDevices]);

  const submitAnswer = useCallback(async ({ blob, text }) => {
    setTranscribing(true);
    setStatus('thinking');
    setTranscriptError('');
    try {
      const url = text
        ? `/api/answer?sessionId=${sessionId}&text=${encodeURIComponent(text)}`
        : `/api/answer?sessionId=${sessionId}`;
      const opts = text
        ? { method: 'POST' }
        : { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob };
      const res = await fetch(url, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Transcription failed');

      setTranscript(data.transcript || '(no speech detected)');

      // Advance local session state
      setSession((prev) => prev && {
        ...prev,
        questions: [...prev.questions, data.nextQuestion],
        currentQuestionIndex: data.nextIndex,
        history: [
          ...(prev.history || []),
          {
            question: prev.questions[prev.currentQuestionIndex],
            transcript: data.transcript,
            analysisTags: data.analysisTags || [],
            isFollowup: data.isFollowup,
          },
        ],
      });

      if (data.isComplete) setCompleted(true);

      // Stream the new line immediately using the voice token from the response.
      // (We use the ref because playVoice is declared later in this component.)
      const play = playVoiceRef.current;
      if (play) {
        // For the closing line, defer one tick so setCompleted has flushed and
        // playVoice's onEnd closure sees `completed === true`.
        if (data.isComplete) setTimeout(() => play(data.voice || null), 0);
        else play(data.voice || null);
      }
    } catch (err) {
      setTranscriptError(err.message || 'Transcription failed');
    } finally {
      setTranscribing(false);
    }
  }, [sessionId]);

  // Keep older name working
  const sendRecording = useCallback((blob) => submitAnswer({ blob }), [submitAnswer]);

  const releaseMic = useCallback(() => {
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;
    mediaRecorderRef.current = null;
    transcriberRef.current = null;
  }, []);

  const stopRecording = useCallback(async () => {
    const t = transcriberRef.current;
    const mr = mediaRecorderRef.current;

    if (t) {
      // Live-stream path: ask Deepgram for the final transcript, then submit.
      setRecording(false);
      setMicMuted(true);
      setTranscribing(true);
      setStatus('thinking');
      try {
        const text = await t.stop();
        releaseMic();
        setInterimText('');
        if (text && text.trim()) {
          submitAnswer({ text: text.trim() });
        } else {
          setTranscriptError('No speech detected');
          setTranscribing(false);
          setStatus('listening');
        }
      } catch (err) {
        releaseMic();
        setInterimText('');
        setTranscriptError(err?.message || 'Transcription failed');
        setTranscribing(false);
        setStatus('listening');
      }
    } else if (mr && mr.state !== 'inactive') {
      // Fallback REST path
      mr.stop();
    }
  }, [releaseMic, submitAnswer]);

  const startRecording = useCallback(async () => {
    setMicError('');
    setTranscript('');
    setInterimText('');
    setTranscriptError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
      });
      audioStreamRef.current = stream;
      setMicPermission(true);

      // Remember which mic actually got picked
      if (!selectedMicId) {
        const id = stream.getAudioTracks()[0]?.getSettings?.()?.deviceId;
        if (id) {
          setSelectedMicId(id);
          try { localStorage.setItem('silkhr.micId', id); } catch {}
        }
      }

      const dgKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;

      if (dgKey) {
        // === Live streaming path: client → Deepgram WS ===
        const transcriber = new DeepgramLiveTranscriber({ apiKey: dgKey, language: 'multi' });
        transcriber.onInterim = (text) => setInterimText(text);
        transcriber.onError   = (err) => console.warn('[dg-live]', err);

        try {
          await transcriber.start(stream);
        } catch (err) {
          // Fall back to REST path below
          console.warn('[dg-live] failed to start, falling back to REST:', err);
          transcriberRef.current = null;
        }
        if (transcriber.ws) transcriberRef.current = transcriber;
      }

      if (!transcriberRef.current) {
        // === Fallback REST path: record full blob then upload ===
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        recordedChunksRef.current = [];
        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        mr.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: mr.mimeType || 'audio/webm' });
          releaseMic();
          setRecording(false);
          setMicMuted(true);
          if (blob.size > 0) sendRecording(blob);
        };
        mr.start();
      }

      setRecording(true);
      setMicMuted(false);
      setStatus('listening');
      refreshDevices();
    } catch (err) {
      setMicError(err?.message || 'Microphone unavailable');
      setMicMuted(true);
      setRecording(false);
    }
  }, [selectedMicId, refreshDevices, sendRecording, releaseMic]);

  const toggleMic = useCallback(() => {
    if (recording) stopRecording();
    else startRecording();
  }, [recording, startRecording, stopRecording]);

  const playVoice = useCallback(async (voiceOrNull) => {
    const player = playerRef.current;
    if (!player) return;

    setStatus('loading');
    setAutoplayBlocked(false);
    setAudioError('');

    let voice = voiceOrNull;
    if (!voice) {
      // Mint a fresh voice token from the server.
      try {
        const idx = session?.currentQuestionIndex ?? 0;
        const r = await fetch(`/api/voice?sessionId=${sessionId}&idx=${idx}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Voice mint failed');
        voice = data;
      } catch (err) {
        setAudioError(err.message || 'Voice unavailable');
        setStatus('listening');
        if (completedRef.current) setTimeout(() => router.push(`/feedback/${sessionId}`), 400);
        return;
      }
    }

    await player.play({
      wsUrl: voice.wsUrl,
      token: voice.token,
      text: voice.text,
      onStart: () => setStatus('speaking'),
      onEnd: () => {
        setStatus('listening');
        if (completedRef.current) setTimeout(() => router.push(`/feedback/${sessionId}`), 600);
      },
      onError: (err) => {
        // AudioContext suspended (autoplay policy) — show the click-to-start UI
        if (player.ctx && player.ctx.state === 'suspended') {
          setAutoplayBlocked(true);
        } else {
          setAudioError(err.message || 'Voice stream error');
        }
        setStatus('listening');
        if (completedRef.current) setTimeout(() => router.push(`/feedback/${sessionId}`), 400);
      },
    });
  }, [session?.currentQuestionIndex, sessionId, router]);

  // Expose to the [session?.sessionId] mount effect declared above
  useEffect(() => { playVoiceRef.current = playVoice; }, [playVoice]);

  const replay = useCallback(() => {
    playVoice(null); // always mint fresh — old token may have expired
  }, [playVoice]);

  const resumeAudio = useCallback(async () => {
    // First user click after autoplay was blocked — resume context, then replay
    if (playerRef.current) {
      try { await playerRef.current.resume(); } catch {}
    }
    setAutoplayBlocked(false);
    playVoice(null);
  }, [playVoice]);

  const endCall = () => {
    if (streamRef.current)      streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach((t) => t.stop());
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (transcriberRef.current) transcriberRef.current.stop().catch(() => {});
    if (playerRef.current) playerRef.current.stop();

    // If the candidate answered at least one question, take them to feedback.
    // Otherwise (they bailed before saying anything) go back to setup.
    const hasProgress = (session?.history?.length || 0) > 0 || completedRef.current;
    router.push(hasProgress ? `/feedback/${sessionId}` : '/');
  };

  const pickCam = (id) => {
    setSelectedCamId(id);
    try { localStorage.setItem('silkhr.camId', id); } catch {}
    setCamMenuOpen(false);
  };

  const pickMic = (id) => {
    setSelectedMicId(id);
    try { localStorage.setItem('silkhr.micId', id); } catch {}
    setMicMenuOpen(false);
  };

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0F0D0B] text-[#FEF9EC] gap-3">
        <p className="text-sm">Couldn't load this session.</p>
        <p className="text-xs text-[#78716C]">{error}</p>
        <button onClick={() => router.push('/')} className="text-xs underline">Back to setup</button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0F0D0B]">
        <p className="text-[10px] tracking-widest uppercase text-[#78716C]">Connecting…</p>
      </div>
    );
  }

  const idx = session.currentQuestionIndex;
  const speaking = status === 'speaking';
  const initials = initialsFor(session.config.role || 'You');

  const activeToggles = [];
  if (session.config.pressureMode)  activeToggles.push('Pressure');
  if (session.config.hinglishMode)  activeToggles.push('Hinglish');
  if (session.config.deepFollowups) activeToggles.push('Deep follow-ups');

  // Mic permission helper — show "Grant" only if no audio device has a label yet
  const micNeedsPermission = !micPermission && audioDevices.every((d) => !d.label);

  return (
    <div className="h-screen flex flex-col bg-[#0F0D0B] text-[#FEF9EC] overflow-hidden">

      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="tracking-[0.25em] text-xs uppercase" style={{ fontFamily: 'var(--font-geist-mono)' }}>
            SilkHR
          </span>
          <div className="flex gap-1">
            {session.questions.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i < idx ? 'bg-[#F0B96B]' : i === idx ? 'bg-[#FEF9EC]' : 'bg-[#3D3733]'
                }`}
              />
            ))}
          </div>
          {activeToggles.length > 0 && (
            <div className="flex gap-1.5">
              {activeToggles.map((t) => (
                <span key={t} className="text-[9px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full border border-[#3D3733] text-[#A89F92]">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] tracking-widest uppercase text-[#78716C]">
          <span>{session.config.role} · {session.config.interviewType}</span>
          <span className="font-mono text-[#FEF9EC]">{formatTime(elapsed)}</span>
        </div>
      </header>

      {/* Tiles */}
      <main className="flex-1 min-h-0 px-6 pb-4">
        <div className="h-full grid grid-cols-2 gap-4">

          {/* Interviewer tile */}
          <div className="relative rounded-2xl bg-[#1C1917] border border-[#3D3733] overflow-hidden flex flex-col items-center justify-center">
            <VoiceOrb active={speaking} />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-sm font-medium">Interviewer</span>
              <span className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-[#A89F92]">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  speaking ? 'bg-[#F0B96B] animate-pulse' :
                  status === 'loading' ? 'bg-amber-500 animate-pulse' :
                  'bg-[#78716C]'
                }`} />
                {STATUS_LABEL[status]}
              </span>
            </div>
          </div>

          {/* Candidate tile */}
          <div className="relative rounded-2xl bg-[#1C1917] border border-[#3D3733] overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${camOn && !camError ? 'opacity-100' : 'opacity-0'}`}
              style={{ transform: 'scaleX(-1)' }}
            />
            {(!camOn || camError) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-[#2A2622] border border-[#3D3733] flex items-center justify-center">
                  <span className="text-3xl font-medium text-[#A89F92]">{initials || 'You'}</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-sm font-medium">You</span>
              <span className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-[#A89F92]">
                {transcribing ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Transcribing</>
                ) : recording ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Recording</>
                ) : (
                  <><IconMic muted /> Muted</>
                )}
              </span>
            </div>

            {((recording && interimText) || transcript || transcriptError) && (
              <div className="absolute top-4 left-4 right-4 px-3 py-2 rounded-lg bg-[#0F0D0B]/85 backdrop-blur-sm border border-[#3D3733]">
                <div className="text-[9px] tracking-widest uppercase text-[#78716C] mb-1 flex items-center gap-1.5">
                  {transcriptError ? 'Transcription error' :
                   recording ? (<><span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Live</>) :
                   'You said'}
                </div>
                <p className={`text-xs leading-relaxed ${
                  transcriptError ? 'text-rose-400' :
                  recording ? 'text-[#FEF9EC]/85 italic' :
                  'text-[#FEF9EC]'
                }`}>
                  {transcriptError || (recording ? interimText : transcript)}
                </p>
              </div>
            )}

            {camError && (
              <p className="absolute top-4 left-4 right-4 text-[10px] tracking-wide text-[#78716C]">
                {camError}
              </p>
            )}
            {micError && (
              <p className="absolute top-12 left-4 right-4 text-[10px] tracking-wide text-rose-400">
                {micError}
              </p>
            )}
          </div>

        </div>
      </main>

      {/* Bottom control bar */}
      <div className="flex-shrink-0 px-6 pb-6 pt-6">
        <div className="flex items-end justify-center gap-3">

          {/* Mic */}
          <div ref={micWrapRef} className="relative flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setMicMenuOpen((o) => !o); setCamMenuOpen(false); }}
              title="Switch microphone"
              className={`w-9 h-7 rounded-md flex items-center justify-center transition-all ${
                micMenuOpen
                  ? 'bg-[#F0B96B] border border-[#F0B96B] text-[#0F0D0B]'
                  : 'bg-[#2A2622] border border-[#5C5650] text-[#FEF9EC] hover:bg-[#3D3733] hover:border-[#A89F92]'
              }`}
            >
              <IconChevronUp />
            </button>
            <button
              type="button"
              onClick={toggleMic}
              disabled={transcribing || status === 'speaking' || status === 'loading' || completed}
              title={
                completed                  ? 'Interview complete' :
                status === 'speaking'      ? 'Wait for the interviewer to finish' :
                status === 'loading'       ? 'Loading question…' :
                transcribing               ? 'Transcribing…' :
                recording                  ? 'Stop recording (send for transcription)' :
                                             'Start recording your answer'
              }
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                transcribing
                  ? 'bg-[#1C1917] border border-[#3D3733] text-[#5C5650] cursor-wait'
                  : recording
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 animate-pulse'
                    : (status === 'speaking' || status === 'loading' || completed)
                      ? 'bg-[#1C1917] border border-[#2A2622] text-[#5C5650] cursor-not-allowed'
                      : 'bg-[#1C1917] border border-[#3D3733] text-[#A89F92] hover:border-[#5C5650]'
              }`}
            >
              <IconMic muted={!recording} />
            </button>
            {micMenuOpen && (
              <DeviceMenu
                kind="audioinput"
                label="Microphone"
                devices={audioDevices}
                selectedId={selectedMicId}
                onSelect={pickMic}
                onRequest={requestMicPermission}
                needsPermission={micNeedsPermission}
                error={micError}
              />
            )}
          </div>

          {/* Camera */}
          <div ref={camWrapRef} className="relative flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setCamMenuOpen((o) => !o); setMicMenuOpen(false); }}
              title="Switch camera"
              className={`w-9 h-7 rounded-md flex items-center justify-center transition-all ${
                camMenuOpen
                  ? 'bg-[#F0B96B] border border-[#F0B96B] text-[#0F0D0B]'
                  : 'bg-[#2A2622] border border-[#5C5650] text-[#FEF9EC] hover:bg-[#3D3733] hover:border-[#A89F92]'
              }`}
            >
              <IconChevronUp />
            </button>
            <button
              type="button"
              onClick={() => setCamOn((c) => !c)}
              title={camOn ? 'Turn off camera' : 'Turn on camera'}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                camOn
                  ? 'bg-[#1C1917] border border-[#3D3733] text-[#FEF9EC] hover:border-[#5C5650]'
                  : 'bg-rose-500/20 border border-rose-500/50 text-rose-400'
              }`}
            >
              <IconCam off={!camOn} />
            </button>
            {camMenuOpen && (
              <DeviceMenu
                kind="videoinput"
                label="Camera"
                devices={videoDevices}
                selectedId={selectedCamId}
                onSelect={pickCam}
                error={camError}
              />
            )}
          </div>

          {/* Replay */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="h-7" />
            <button
              type="button"
              onClick={replay}
              disabled={status === 'loading' || status === 'thinking' || transcribing}
              title="Replay current question"
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                (status === 'loading' || status === 'thinking' || transcribing)
                  ? 'bg-[#1C1917] border border-[#2A2622] text-[#5C5650] cursor-not-allowed'
                  : 'bg-[#1C1917] border border-[#3D3733] text-[#FEF9EC] hover:border-[#5C5650]'
              }`}
            >
              <IconReplay />
            </button>
          </div>

          {/* End */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="h-7" />
            <button
              type="button"
              onClick={endCall}
              title="End interview"
              className="h-14 px-6 rounded-full flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white transition-colors"
            >
              <IconEnd />
              <span className="text-sm font-medium">End</span>
            </button>
          </div>

        </div>

        {/* Secondary actions */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] tracking-widest uppercase text-[#78716C]">
          <button
            onClick={() => setTypeMode(true)}
            disabled={transcribing || status === 'speaking' || status === 'loading' || completed}
            className="hover:text-[#FEF9EC] transition-colors disabled:opacity-30 disabled:hover:text-[#78716C]"
          >
            Type answer
          </button>
          <span className="text-[#3D3733]">·</span>
          <button
            onClick={() => submitAnswer({ text: '(no answer)' })}
            disabled={transcribing || status === 'speaking' || status === 'loading' || completed}
            className="hover:text-[#FEF9EC] transition-colors disabled:opacity-30 disabled:hover:text-[#78716C]"
          >
            Skip question
          </button>
        </div>

        {typeMode && (
          <div className="fixed inset-0 z-50 bg-[#0F0D0B]/80 backdrop-blur-sm flex items-end justify-center p-6">
            <div className="w-full max-w-2xl bg-[#1C1917] border border-[#3D3733] rounded-2xl p-5">
              <div className="text-[10px] tracking-widest uppercase text-[#78716C] mb-2 font-semibold">
                Type your answer
              </div>
              <textarea
                autoFocus
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="What you would have said..."
                rows={4}
                className="w-full bg-[#0F0D0B] border border-[#3D3733] rounded-xl px-4 py-3 text-sm text-[#FEF9EC] placeholder:text-[#5C5650] focus:outline-none focus:border-[#A89F92] resize-none"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => { setTypeMode(false); setTypedAnswer(''); }}
                  className="px-4 py-2 text-xs text-[#A89F92] hover:text-[#FEF9EC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const t = typedAnswer.trim();
                    if (!t) return;
                    submitAnswer({ text: t });
                    setTypeMode(false);
                    setTypedAnswer('');
                  }}
                  disabled={!typedAnswer.trim()}
                  className="px-5 py-2 text-xs font-medium rounded-full bg-[#F0B96B] text-[#0F0D0B] hover:bg-[#FEF9EC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {autoplayBlocked && (
          <p className="mt-3 text-center text-[10px] tracking-widest uppercase text-[#F0B96B]">
            <button onClick={resumeAudio} className="underline">Click to start interviewer audio</button>
          </p>
        )}
        {audioError && !autoplayBlocked && (
          <p className="mt-3 text-center text-[10px] tracking-widest uppercase text-[#78716C]">
            {audioError}
          </p>
        )}
      </div>

    </div>
  );
}
