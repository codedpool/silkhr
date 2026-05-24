// Deepgram Nova-3 transcription helper.
// Accepts a Node Buffer + its content type; returns the transcript string.

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=multi';

export async function transcribe(audioBuffer, contentType = 'audio/webm') {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY not set');

  const res = await fetch(DEEPGRAM_URL, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': contentType,
    },
    body: audioBuffer,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Deepgram ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const transcript =
    data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

  return transcript.trim();
}
