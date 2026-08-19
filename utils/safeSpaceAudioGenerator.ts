/**
 * Safe Space Audio Generator
 * 
 * Gera áudios terapêuticos programaticamente usando Web Audio API.
 * Evita dependência de arquivos estáticos e problemas de direitos autorais.
 * 
 * Para evolução futura: substituir por áudios profissionais hospedados no Supabase Storage.
 */

interface GeneratedTrack {
    url: string;
    duration: number; // seconds
}

// Cache para evitar regeneração
const audioCache = new Map<string, GeneratedTrack>();

/**
 * Renderiza um AudioBuffer para Blob URL
 */
function renderToBlob(buffer: AudioBuffer): string {
    // Encode as WAV
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true);  // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Write samples
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) {
        channels.push(buffer.getChannelData(ch));
    }

    let offset = headerSize;
    for (let i = 0; i < length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const sample = Math.max(-1, Math.min(1, channels[ch][i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }
    }

    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
}

/**
 * Track 1: Bilateral EMDR — Tom suave alternando entre ouvidos
 * Duração: 3 minutos
 */
async function generateBilateral(): Promise<GeneratedTrack> {
    const cached = audioCache.get('bilateral');
    if (cached) return cached;

    const sampleRate = 44100;
    const duration = 180; // 3 min
    const ctx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

    // Tom base suave (280Hz)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 280;

    // Volume suave
    const gain = ctx.createGain();
    gain.gain.value = 0.15;

    // Panner para alternar L/R (com fallback genérico para browsers antigos)
    let panner: StereoPannerNode | PannerNode;
    let isStereoPanner = false;
    
    if (typeof ctx.createStereoPanner === 'function') {
        panner = ctx.createStereoPanner();
        isStereoPanner = true;
    } else {
        panner = ctx.createPanner();
        panner.panningModel = 'equalpower';
    }

    // Fade in/out
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, 0);
    masterGain.gain.linearRampToValueAtTime(1, 3); // 3s fade in
    masterGain.gain.setValueAtTime(1, duration - 3);
    masterGain.gain.linearRampToValueAtTime(0, duration); // 3s fade out

    // Alternar pan a cada ~1s (BLS típico)
    const panInterval = 1.0;
    for (let t = 0; t < duration; t += panInterval) {
        const panValue = (Math.floor(t / panInterval) % 2 === 0) ? -0.9 : 0.9;
        if (isStereoPanner) {
            (panner as StereoPannerNode).pan.setValueAtTime(panValue, t);
        } else {
            (panner as PannerNode).setPosition(panValue, 0, 1 - Math.abs(panValue));
        }
    }

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.start(0);
    osc.stop(duration);

    const buffer = await ctx.startRendering();
    const url = renderToBlob(buffer);
    const track = { url, duration };
    audioCache.set('bilateral', track);
    return track;
}

/**
 * Track 2: Grounding 432Hz — Onda senoidal contínua com envelope suave
 * Duração: 2 min 16 seg
 */
async function generateGrounding(): Promise<GeneratedTrack> {
    const cached = audioCache.get('grounding');
    if (cached) return cached;

    const sampleRate = 44100;
    const duration = 136; // 2:16
    const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);

    // Tom fundamental 432Hz
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 432;

    // Harmônico suave (octave abaixo)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 216;

    const gain1 = ctx.createGain();
    gain1.gain.value = 0.12;

    const gain2 = ctx.createGain();
    gain2.gain.value = 0.06;

    // Fade in/out suave
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, 0);
    masterGain.gain.linearRampToValueAtTime(1, 5); // 5s fade in
    masterGain.gain.setValueAtTime(1, duration - 5);
    masterGain.gain.linearRampToValueAtTime(0, duration);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(masterGain);
    gain2.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start(0);
    osc2.start(0);
    osc1.stop(duration);
    osc2.stop(duration);

    const buffer = await ctx.startRendering();
    const url = renderToBlob(buffer);
    const track = { url, duration };
    audioCache.set('grounding', track);
    return track;
}

/**
 * Track 3: Chuva e Trovões — Ruído filtrado simulando chuva
 * Duração: 3 min 49 seg
 */
async function generateRain(): Promise<GeneratedTrack> {
    const cached = audioCache.get('rain');
    if (cached) return cached;

    const sampleRate = 44100;
    const duration = 229; // 3:49
    const length = sampleRate * duration;
    const ctx = new OfflineAudioContext(2, length, sampleRate);

    // Gerar ruído branco manualmente via buffer
    const noiseBuffer = ctx.createBuffer(2, length, sampleRate);
    const leftChannel = noiseBuffer.getChannelData(0);
    const rightChannel = noiseBuffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
        // Ruído rosa (acumula e decai para simular chuva)
        const white = Math.random() * 2 - 1;
        leftChannel[i] = white * 0.15;
        rightChannel[i] = (Math.random() * 2 - 1) * 0.15;
    }

    // Aplicar variação de amplitude suave para simular rajadas
    const envelopeFreq = 0.03; // ciclos por segundo
    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const envelope = 0.6 + 0.4 * Math.sin(2 * Math.PI * envelopeFreq * t);
        // Simular trovões distantes com pulsos raros
        let thunder = 0;
        // ~5 trovões ao longo da faixa
        const thunderTimes = [28, 62, 105, 148, 195];
        for (const tt of thunderTimes) {
            const dist = Math.abs(t - tt);
            if (dist < 3) {
                thunder = Math.exp(-dist * 2) * 0.3 * Math.sin(t * 40 + Math.sin(t * 7) * 3);
            }
        }
        leftChannel[i] = leftChannel[i] * envelope + thunder;
        rightChannel[i] = rightChannel[i] * envelope + thunder * 0.7;
    }

    // Fade in/out
    const fadeIn = sampleRate * 4; // 4s
    const fadeOut = sampleRate * 4;
    for (let i = 0; i < fadeIn; i++) {
        const factor = i / fadeIn;
        leftChannel[i] *= factor;
        rightChannel[i] *= factor;
    }
    for (let i = 0; i < fadeOut; i++) {
        const idx = length - 1 - i;
        const factor = i / fadeOut;
        leftChannel[idx] *= factor;
        rightChannel[idx] *= factor;
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    // Filtro passa-baixa para suavizar (simular chuva)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;

    source.connect(filter);
    filter.connect(ctx.destination);

    source.start(0);

    const buffer = await ctx.startRendering();
    const url = renderToBlob(buffer);
    const track = { url, duration };
    audioCache.set('rain', track);
    return track;
}

/**
 * Gera todas as faixas de áudio do Lugar Seguro.
 * Retorna um mapa de id -> { url, duration }
 */
export async function generateAllTracks(): Promise<Map<number, GeneratedTrack>> {
    const results = new Map<number, GeneratedTrack>();
    
    const [bilateral, grounding, rain] = await Promise.all([
        generateBilateral(),
        generateGrounding(),
        generateRain()
    ]);

    results.set(1, bilateral);
    results.set(2, grounding);
    results.set(3, rain);

    return results;
}

/**
 * Gera uma faixa específica por ID
 */
export async function generateTrack(trackId: number): Promise<GeneratedTrack | null> {
    switch (trackId) {
        case 1: return generateBilateral();
        case 2: return generateGrounding();
        case 3: return generateRain();
        default: return null;
    }
}

/**
 * Libera memória revogando todas as URLs e limpando o cache
 */
export function clearAudioCache(): void {
    audioCache.forEach((track) => {
        URL.revokeObjectURL(track.url);
    });
    audioCache.clear();
}
