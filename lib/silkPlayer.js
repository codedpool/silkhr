// Client-side streaming player for Silk muga.
//
// Opens a WebSocket to Silk's TTS endpoint, decodes incoming PCM int16 LE
// @ 24 kHz mono into AudioBuffers, and schedules them on a shared AudioContext.
// First audio plays as soon as the first chunk arrives — usually < 1s.

export class SilkVoicePlayer {
  constructor() {
    this.ctx = null;
    this.ws = null;
    this.sources = [];
    this.playAt = 0;
    this.activePlay = null; // guards against stale callbacks
  }

  ensureContext() {
    if (!this.ctx) {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) throw new Error('AudioContext unavailable');
      this.ctx = new AC({ sampleRate: 24000 });
    }
    return this.ctx;
  }

  async resume() {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx.state === 'running';
  }

  stop() {
    // Stop any pending buffer sources
    for (const src of this.sources) {
      try { src.stop(); } catch {}
      try { src.disconnect(); } catch {}
    }
    this.sources = [];

    // Close any open WS
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    // Reset scheduling clock to now
    if (this.ctx) this.playAt = this.ctx.currentTime;

    // Invalidate any in-flight callbacks
    this.activePlay = null;
  }

  // play({ wsUrl, token, text, onStart, onEnd, onError })
  // - onStart fires when the first PCM chunk has been scheduled
  // - onEnd fires after the LAST scheduled chunk finishes playing
  // - onError fires on WS error / server error frame
  async play({ wsUrl, token, text, onStart, onEnd, onError }) {
    this.stop(); // cancel any previous playback
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch {}
    }

    const playId = Symbol('play');
    this.activePlay = playId;
    const isStale = () => this.activePlay !== playId;

    let started = false;
    let doneFrameReceived = false;

    this.playAt = Math.max(this.playAt, ctx.currentTime);

    const url = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      if (isStale()) { try { ws.close(); } catch {}; return; }
      ws.send(JSON.stringify({ text }));
    };

    ws.onmessage = (e) => {
      if (isStale()) return;

      if (e.data instanceof ArrayBuffer) {
        const pcm = new Int16Array(e.data);
        if (pcm.length === 0) return;

        const buf = ctx.createBuffer(1, pcm.length, 24000);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;

        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        const startAt = Math.max(this.playAt, ctx.currentTime);
        src.start(startAt);
        this.playAt = startAt + buf.duration;
        this.sources.push(src);

        if (!started) {
          started = true;
          try { onStart?.(); } catch {}
        }
      } else {
        // Text frame: { type: 'done' } or { error: '...' }
        try {
          const msg = JSON.parse(e.data);
          if (msg?.type === 'done') {
            doneFrameReceived = true;
            // Schedule onEnd for when the last buffered audio finishes
            const delayMs = Math.max(0, (this.playAt - ctx.currentTime) * 1000);
            setTimeout(() => {
              if (!isStale()) try { onEnd?.(); } catch {}
            }, delayMs);
            try { ws.close(); } catch {}
          } else if (msg?.error) {
            try { onError?.(new Error(msg.error)); } catch {}
            try { ws.close(); } catch {}
          }
        } catch {
          // ignore non-JSON text frames
        }
      }
    };

    ws.onerror = () => {
      if (isStale()) return;
      try { onError?.(new Error('Voice stream error')); } catch {}
    };

    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      // If the WS closed without ever delivering a chunk, surface as error
      if (!isStale() && !started && !doneFrameReceived) {
        try { onError?.(new Error('Voice stream closed before audio')); } catch {}
      }
    };
  }

  dispose() {
    this.stop();
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
      this.ctx = null;
    }
  }
}
