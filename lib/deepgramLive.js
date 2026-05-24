// Client-side Deepgram live (streaming) transcriber.
//
// Opens a WebSocket to Deepgram and streams MediaRecorder WebM/Opus chunks
// as the user speaks. Authentication uses the Sec-WebSocket-Protocol
// subprotocol trick: ['token', '<key>']. Hackathon key in NEXT_PUBLIC_ env.

const DG_WS_URL = 'wss://api.deepgram.com/v1/listen';

function pickMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export class DeepgramLiveTranscriber {
  constructor({ apiKey, language = 'multi' } = {}) {
    this.apiKey   = apiKey;
    this.language = language;
    this.ws       = null;
    this.recorder = null;
    this.finals   = [];
    this.partial  = '';
    this.onInterim = null;   // (visibleText: string) => void
    this.onError   = null;   // (err: Error) => void
    this._closed  = false;
  }

  fullText() {
    return this.finals.join(' ').replace(/\s+/g, ' ').trim();
  }

  visibleText() {
    const f = this.fullText();
    if (this.partial) return f ? `${f} ${this.partial}` : this.partial;
    return f;
  }

  // Resolves once the WS handshake completes and recording is feeding the socket.
  async start(stream) {
    if (!this.apiKey) throw new Error('No Deepgram API key configured');

    const params = new URLSearchParams({
      model:           'nova-3',
      language:        this.language,
      smart_format:    'true',
      interim_results: 'true',
      punctuate:       'true',
    });

    const url = `${DG_WS_URL}?${params.toString()}`;

    // Browsers can't set Authorization headers on WebSocket; Deepgram accepts
    // the Sec-WebSocket-Protocol fallback: ['token', '<API_KEY>'].
    this.ws = new WebSocket(url, ['token', this.apiKey]);

    await new Promise((resolve, reject) => {
      const onOpen  = () => { this.ws.removeEventListener('error', onError); resolve(); };
      const onError = () => { this.ws.removeEventListener('open',  onOpen);  reject(new Error('Deepgram WS connect failed')); };
      this.ws.addEventListener('open',  onOpen,  { once: true });
      this.ws.addEventListener('error', onError, { once: true });
    });

    this.ws.addEventListener('message', (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'Results') {
          const text = msg.channel?.alternatives?.[0]?.transcript || '';
          if (msg.is_final) {
            if (text) this.finals.push(text);
            this.partial = '';
          } else {
            this.partial = text;
          }
          if (text || msg.is_final) try { this.onInterim?.(this.visibleText()); } catch {}
        }
      } catch {
        // ignore unparseable frames
      }
    });

    this.ws.addEventListener('error', () => {
      if (this._closed) return;
      try { this.onError?.(new Error('Deepgram stream error')); } catch {}
    });

    const mimeType = pickMimeType();
    this.recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

    this.recorder.addEventListener('dataavailable', (e) => {
      if (e.data && e.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(e.data);
      }
    });

    this.recorder.start(250); // emit a chunk every 250ms
  }

  // Stops the recorder, asks Deepgram to flush, waits for the final transcript.
  // Resolves with the full text.
  async stop({ timeoutMs = 3000 } = {}) {
    if (this._closed) return this.fullText();
    this._closed = true;

    return new Promise((resolve) => {
      let done = false;
      const finalize = () => {
        if (done) return;
        done = true;
        try { this.ws?.close(); } catch {}
        resolve(this.fullText());
      };

      // Stop recorder first to flush any remaining data through dataavailable.
      const flushAndClose = () => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          try { this.ws.send(JSON.stringify({ type: 'CloseStream' })); } catch {}
        }
      };

      if (this.recorder && this.recorder.state !== 'inactive') {
        this.recorder.addEventListener('stop', flushAndClose, { once: true });
        try { this.recorder.stop(); } catch { flushAndClose(); }
      } else {
        flushAndClose();
      }

      if (this.ws) {
        this.ws.addEventListener('close', finalize, { once: true });
      }

      // Safety timeout — don't let the UI hang forever waiting on Deepgram.
      setTimeout(finalize, timeoutMs);
    });
  }
}
