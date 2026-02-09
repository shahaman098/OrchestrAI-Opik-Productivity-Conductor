const axios = require('axios');
require('dotenv').config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default to Rachel

async function generateVoiceReport({ focusScore, taskCount, totalMinutes }) {
    const hours = (totalMinutes / 60).toFixed(1);
    const script = `Schedule optimized. ${taskCount} tasks organized across ${hours} hours. Your focus score is ${focusScore || 85} out of 100. Start with your top priority task and maintain momentum. You've got this.`;

    // Safety: If no API key, return fallback immediately
    if (!ELEVENLABS_API_KEY) {
        console.warn('ELEVENLABS_API_KEY is missing. Returning fallback.');
        return { audio: null, text: script };
    }

    try {
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                text: script,
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            },
            {
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            }
        );

        return {
            audio: Buffer.from(response.data),
            text: script
        };

    } catch (error) {
        console.error('Error calling ElevenLabs API:', error.message);
        return { audio: null, text: script };
    }
}

module.exports = { generateVoiceReport };
