import { useState, useCallback, useRef, useEffect } from 'react';
import type { JSONContent } from '@/types';
import type { CopilotRequest, CopilotResult, EditorSnapshot } from '@/types/copilot';
import { generateUUID } from '@/utils/uuid';
import { supabase } from '@/services/supabaseClient';

export type CopilotStatus = 
  | 'idle' 
  | 'preparing_context' 
  | 'searching' 
  | 'reasoning' 
  | 'generating'
  | 'ready' 
  | 'outdated' 
  | 'error';

// A simple hash function to detect editor changes
export const hashText = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

export const useCopilotSession = (editorContent: string | JSONContent) => {
  const [status, setStatus] = useState<CopilotStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<CopilotResult | null>(null);
  
  const [contextConfig, setContextConfig] = useState({
    useCurrentParagraph: true,
    useSelection: false,
    useLastNTokens: true,
    useFullSession: false,
    useMoodMetrics: true,
    useTags: true,
    useGoals: true,
  });

  const [query, setQuery] = useState('');
  
  const lastSnapshotRef = useRef<EditorSnapshot | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Monitor editor content for 'outdated' state
  useEffect(() => {
    if (status === 'ready' && lastSnapshotRef.current) {
      const currentText = typeof editorContent === 'string' ? editorContent : JSON.stringify(editorContent);
      const currentHash = hashText(currentText);
      const currentCharCount = currentText.length;
      
      const prevHash = lastSnapshotRef.current.hash;
      const prevCharCount = lastSnapshotRef.current.charCount;

      if (currentHash !== prevHash) {
        // Simple heuristic: > 15% change in length or completely different hash
        const changeRatio = Math.abs(currentCharCount - prevCharCount) / Math.max(prevCharCount, 1);
        if (changeRatio > 0.15 || currentHash !== prevHash) {
            // We can be strict and say any hash change is outdated, but to avoid blinking, 
            // maybe we use a debounce or ratio. For now, strict but debounced by user typing in real life.
            // Let's use ratio > 0.05 (5%) for triggering outdated
            if (changeRatio > 0.05) {
                setStatus('outdated');
            }
        }
      }
    }
  }, [editorContent, status]);

  const analyze = async () => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setStatus('preparing_context');
      setErrorMsg(null);

      const currentText = typeof editorContent === 'string' ? editorContent : JSON.stringify(editorContent);
      
      const snapshot: EditorSnapshot = {
        version: lastSnapshotRef.current ? lastSnapshotRef.current.version + 1 : 1,
        hash: hashText(currentText),
        charCount: currentText.length,
        timestamp: new Date().toISOString(),
      };
      
      lastSnapshotRef.current = snapshot;

      const request: CopilotRequest = {
        sessionContext: contextConfig,
        editorSnapshot: snapshot,
        customQuery: query
      };

      // Simulating the pipeline progression visually
      setStatus('searching');
      await new Promise(r => setTimeout(r, 1500));
      setStatus('reasoning');
      await new Promise(r => setTimeout(r, 2000));
      setStatus('generating');
      
      // Chamada real para a Edge Function via Supabase
      const { data, error } = await supabase.functions.invoke('clinical-reasoning', {
        body: request
      });

      if (error) throw new Error(error.message || 'Erro na Edge Function');

      // Atualizando barra de progresso visualmente rápida
      setStatus('generating');
      await new Promise(r => setTimeout(r, 500));

      if (!abortControllerRef.current.signal.aborted) {
        setResult(data as CopilotResult);
        setStatus('ready');
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatus('error');
        setErrorMsg(err.message || 'Falha na análise');
      }
    }
  };

  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('idle');
  };

  return {
    status,
    errorMsg,
    result,
    query,
    setQuery,
    contextConfig,
    setContextConfig,
    analyze,
    cancel
  };
};
