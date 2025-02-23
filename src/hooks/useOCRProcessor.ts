import { useState } from 'react';
import { createWorker } from 'tesseract.js';

interface OCRResult {
  text: string;
  confidence: number;
}

export const useOCRProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processImage = async (imageFile: File): Promise<OCRResult | null> => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);

      // Create a worker
      const worker = createWorker({
        logger: m => {
          console.log(m);
          if (m.status === 'loading tesseract core') setProgress(25);
          if (m.status === 'loading language traineddata') setProgress(50);
          if (m.status === 'initializing api') setProgress(75);
          if (m.status === 'recognizing text') setProgress(90);
        }
      });

      // Initialize worker
      await (await worker).load();
      await (await worker).loadLanguage('eng');
      await (await worker).initialize('eng');

      // Process the image
      const { data } = await (await worker).recognize(imageFile);
      
      // Cleanup
      await (await worker).terminate();
      
      setProgress(100);

      if (!data.text.trim()) {
        throw new Error('No text was detected in the image. Please try a clearer image.');
      }

      return {
        text: data.text.trim(),
        confidence: data.confidence
      };
    } catch (err) {
      console.error('OCR processing failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to process handwritten text. Please try again.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processImage,
    isProcessing,
    progress,
    error
  };
}; 