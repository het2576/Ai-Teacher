import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Check for API key and throw clear error if missing
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error('Missing Gemini API key. Add VITE_GEMINI_API_KEY to your .env file');
}

// Initialize the API with your key
const genAI = new GoogleGenerativeAI(API_KEY);
const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const textModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface UseAIResponseProps {
  enableVoice?: boolean;
  enableCamera?: boolean;
}

export const useAIResponse = (props?: UseAIResponseProps) => {
  const { 
    enableVoice = false, 
    enableCamera = false
  } = props || {};
  const [voiceOutput, setVoiceOutput] = useState<SpeechSynthesisUtterance | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Initialize speech synthesis
  useEffect(() => {
    if (enableVoice) {
      const utterance = new SpeechSynthesisUtterance();
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        setIsSpeaking(false);
        setError('Failed to speak response');
      };
      
      setVoiceOutput(utterance);
    }
  }, [enableVoice]);

  const speakResponse = (text: string) => {
    if (!voiceOutput || !enableVoice || isSpeaking) return;
    
    try {
      window.speechSynthesis.cancel();
      voiceOutput.text = text;
      window.speechSynthesis.speak(voiceOutput);
    } catch (err) {
      console.error('Error speaking response:', err);
      setError('Failed to speak response');
    }
  };

  const processAIResponse = async (prompt: string, imageInput?: HTMLImageElement | HTMLVideoElement | { inlineData: { data: string, mimeType: string } }) => {
    try {
      setIsLoading(true);
      setError(null);

      let text;

      if (imageInput) {
        try {
          let imageData;
          
          if ('inlineData' in imageInput) {
            // Handle inline base64 data
            imageData = imageInput.inlineData;
          } else if (imageInput instanceof HTMLVideoElement) {
            // Handle video element
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not available');

            if (imageInput.readyState < 2) {
              await new Promise(resolve => {
                imageInput.onloadeddata = resolve;
              });
            }

            ctx.drawImage(imageInput, 0, 0, canvas.width, canvas.height);
            const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            imageData = { data: base64Data, mimeType: 'image/jpeg' };
          }

          if (!imageData) throw new Error('Invalid image input');

          const result = await visionModel.generateContent([
            { inlineData: imageData },
            { text: prompt || "What's in this image?" }
          ]);

          const response = await result.response;
          text = response.text();
        } catch (err) {
          console.error('Vision API Error:', err);
          throw new Error('Failed to analyze image');
        }
      } else {
        const result = await textModel.generateContent(prompt);
        const response = await result.response;
        text = response.text();
      }

      if (text && enableVoice) {
        speakResponse(text);
      }

      return { text };
    } catch (error) {
      console.error('Error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize camera stream
  useEffect(() => {
    if (enableCamera) {
      const initCamera = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          setStream(mediaStream);
        } catch (error) {
          console.error('Error accessing camera:', error);
        }
      };
      initCamera();
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [enableCamera]);

  return {
    processAIResponse,
    imageData,
    stream,
    isListening,
    transcript,
    isLoading,
    error,
    setError,
    isSpeaking
  };
};
