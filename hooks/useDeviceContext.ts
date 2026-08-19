import { useState, useEffect, useCallback } from 'react';
import type { DeviceContext } from '@/types';

/**
 * Detecta o navegador e SO a partir do User-Agent.
 * Parser simples e robusto — não precisa de dependência externa.
 */
function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = 'Unknown';
  let os = 'Unknown';

  // Browser detection
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

  // OS detection
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os };
}

/**
 * Amostra o FPS real do dispositivo medindo frames via requestAnimationFrame.
 * Retorna uma Promise que resolve após `sampleFrames` frames.
 */
function sampleFPS(sampleFrames = 30): Promise<number> {
  return new Promise((resolve) => {
    let frameCount = 0;
    const startTime = performance.now();

    function countFrame() {
      frameCount++;
      if (frameCount >= sampleFrames) {
        const elapsed = performance.now() - startTime;
        const fps = Math.round((frameCount / elapsed) * 1000);
        resolve(fps);
      } else {
        requestAnimationFrame(countFrame);
      }
    }

    requestAnimationFrame(countFrame);
  });
}

/**
 * Detecta o método de input primário do dispositivo.
 * Usa a API matchMedia 'pointer' e 'hover' do CSS Level 4.
 */
function detectInputMethod(): 'keyboard' | 'mouse' | 'touch' {
  if (typeof window === 'undefined') return 'keyboard';

  // touchscreen sem hover = provavelmente mobile/tablet
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const hasNoHover = window.matchMedia('(hover: none)').matches;

  if (hasCoarsePointer && hasNoHover) return 'touch';
  return 'mouse'; // Desktop com mouse — teclado é detectado dinamicamente durante o teste
}

/**
 * Hook que captura metadados do hardware e performance do dispositivo.
 * 
 * Executado uma vez no mount — registra resolução, DPI, navegador, SO,
 * método de input e FPS. Esses dados são salvos junto com cada resultado
 * de teste cognitivo para controle de equivalência psicométrica.
 */
export const useDeviceContext = () => {
  const [context, setContext] = useState<DeviceContext | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function capture() {
      const { browser, os } = parseUserAgent(navigator.userAgent);
      const fps = await sampleFPS(30);

      if (cancelled) return;

      setContext({
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        devicePixelRatio: window.devicePixelRatio || 1,
        inputMethod: detectInputMethod(),
        browser,
        os,
        fps,
      });
      setIsReady(true);
    }

    capture();
    return () => { cancelled = true; };
  }, []);

  /** Atualiza o inputMethod em runtime (ex: se o paciente usar teclado no Stroop) */
  const updateInputMethod = useCallback((method: DeviceContext['inputMethod']) => {
    setContext(prev => prev ? { ...prev, inputMethod: method } : null);
  }, []);

  return { deviceContext: context, isReady, updateInputMethod };
};
