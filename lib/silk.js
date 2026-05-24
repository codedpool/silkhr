// Silk muga TTS helper. Returns 24 kHz mono WAV bytes (Buffer).
//
// muga is a Hinglish emotion-TTS model steered entirely by a [tone] prefix in
// the text. No description / speaker / f0_up_key — those are mulberry-only.
//
// Tone prefix (one of): [neutral] [happy] [sad] [excited] [angry] [whisper]
// Inline events (sparingly): <laugh> <chuckle> <sigh> — lowercase, space on
// both sides, never mid-word. Match event to tone (see prompting guide).
//
// Text must be Latin script. For Hindi, transliterate: "yeh ek test" not
// "यह एक टेस्ट" (the model saw zero Devanagari).

const SILK_URL    = 'https://silk-api.rumik.ai/v1/tts';
const SILK_WS_URL = 'https://silk-api.rumik.ai/v1/tts/ws-connect';

const ALLOWED_TONES = ['neutral', 'happy', 'sad', 'excited', 'angry', 'whisper'];

export function withTone(text, tone) {
  const stripped = text.trim();
  // If caller already prefixed a [tone] marker, leave it alone.
  if (/^\[[a-z]+\]/i.test(stripped)) return stripped;
  const t = ALLOWED_TONES.includes(tone) ? tone : 'neutral';
  return `[${t}] ${stripped}`;
}

export async function callSilk(text, { tone = 'neutral', temperature = 0.7 } = {}) {
  const apiKey = process.env.SILK_API_KEY;
  if (!apiKey) throw new Error('SILK_API_KEY not set');

  const res = await fetch(SILK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'muga',
      text: withTone(text, tone),
      temperature,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Silk ${res.status}: ${body.slice(0, 300)}`);
  }

  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

// Mint a one-shot WebSocket session for streaming TTS.
// Returns { wsUrl, token, text } — the client opens wsUrl?token=... and sends { text }.
export async function mintSilkWS(text, { tone = 'neutral' } = {}) {
  const apiKey = process.env.SILK_API_KEY;
  if (!apiKey) throw new Error('SILK_API_KEY not set');

  const toned = withTone(text, tone);

  const res = await fetch(SILK_WS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'muga', text: toned }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Silk WS mint ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  if (!data?.ws_url || !data?.token) {
    throw new Error(`Silk WS mint returned unexpected shape: ${JSON.stringify(data).slice(0, 200)}`);
  }

  return { wsUrl: data.ws_url, token: data.token, text: toned };
}
