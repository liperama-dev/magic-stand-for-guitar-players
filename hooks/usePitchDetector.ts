import { useState, useEffect, useRef, useCallback } from 'react';
import { frequencyToNoteName } from '../utils/chords';

export const usePitchDetector = () => {
  const [isListening, setIsListening] = useState(false);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // FIX: useRef must be initialized. Using null as the initial value and a compatible type.
  const animationFrameRef = useRef<number | null>(null);

  const processAudio = useCallback(() => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(buffer);

    // Autocorrelation to find the fundamental frequency
    let bestCorrelation = 0;
    let bestLag = -1;
    const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / bufferLength);

    if (rms > 0.01) { // A threshold to avoid processing silence
        for (let lag = 40; lag < bufferLength / 2; lag++) {
            let correlation = 0;
            for (let i = 0; i < bufferLength / 2; i++) {
                correlation += buffer[i] * buffer[i + lag];
            }
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestLag = lag;
            }
        }
    }
    
    if (bestLag !== -1 && audioContextRef.current) {
        const frequency = audioContextRef.current.sampleRate / bestLag;
        const note = frequencyToNoteName(frequency);
        setDetectedNote(note);
    } else {
        setDetectedNote(null);
    }
    
    animationFrameRef.current = requestAnimationFrame(processAudio);
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048 * 2;
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);
        
        setIsListening(true);
        animationFrameRef.current = requestAnimationFrame(processAudio);
      } catch (err) {
        console.error('Error accessing microphone.', err);
        setError('Microphone access denied. Please allow permission in your browser.');
        setIsListening(false);
      }
    } else {
      setError('Microphone access not supported by this browser.');
    }
  }, [processAudio]);

  const stopListening = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (sourceRef.current) sourceRef.current.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    
    setIsListening(false);
    setDetectedNote(null);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return { isListening, detectedNote, toggleListening, error };
};
