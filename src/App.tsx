import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { 
  Brain, 
  Camera, 
  Mic, 
  Volume2, 
  Loader2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  BookOpen,
  Image,
  MessageSquare,
  RefreshCw,
  Save,
  Share2,
  FileText,
  PenTool,
  GraduationCap,
  Download,
  Upload,
  VolumeX,
  Lightbulb,
  Menu,
  X
} from 'lucide-react';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useAIResponse } from './hooks/useAIResponse';
import { Whiteboard } from './components/Whiteboard';
import { QuizSection } from './components/QuizSection';
import { useOCRProcessor } from './hooks/useOCRProcessor';
import { motion } from 'framer-motion';

const translations = {
  title: 'AI Teacher',
  description: 'Your intelligent learning companion. Ask questions, analyze images, and get instant educational support through natural voice interaction.',
  features: {
    voice: 'Voice-based Q&A',
    image: 'Image Analysis',
    education: 'Educational Support',
    history: 'Conversation History'
  },
  camera: {
    title: 'Camera Input',
    enable: 'Enable Camera',
    disable: 'Disable Camera',
    placeholder: 'Enable camera to analyze images',
    analyze: 'Analyze Image',
    analyzing: 'Analyzing...'
  },
  voice: {
    title: 'Voice Input',
    start: 'Start Listening',
    stop: 'Stop Listening',
    ask: 'Ask Question',
    placeholder: 'Speak to ask a question...'
  },
  response: {
    title: 'AI Response',
    placeholder: 'AI response will appear here...',
    clear: 'Clear',
    history: 'Conversation History'
  },
  modes: {
    chat: 'Chat Mode',
    quiz: 'Quiz Mode',
    whiteboard: 'Whiteboard',
    ocr: 'Handwriting Recognition'
  },
  quiz: {
    start: 'Start Quiz',
    topic: 'Enter quiz topic',
    difficulty: 'Select difficulty'
  },
  ocr: {
    upload: 'Upload Image',
    processing: 'Processing handwriting...',
    placeholder: 'Upload an image of handwritten text to analyze'
  },
  whiteboard: {
    analyze: 'Analyze Drawing',
    clear: 'Clear Board',
    download: 'Save Drawing'
  }
};

type Mode = 'chat' | 'quiz' | 'whiteboard' | 'ocr';

function App() {
  const webcamRef = useRef<Webcam>(null);
  const [isImageAnalysisEnabled, setIsImageAnalysisEnabled] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'text' | 'image'>('text');
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'question' | 'answer';
    text: string;
    timestamp: Date;
  }>>([]);
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening,
    hasPermission,
    resetTranscript
  } = useVoiceRecognition();
  
  const {
    processAIResponse,
    isLoading,
    error: aiError,
    isSpeaking
  } = useAIResponse({ 
    enableVoice: true, 
    enableCamera: isImageAnalysisEnabled
  });

  const [error, setError] = useState<string | null>(null);

  const [response, setResponse] = useState('');
  const [mode, setMode] = useState<Mode>('chat');
  const [quizTopic, setQuizTopic] = useState('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  
  const ocrProcessor = useOCRProcessor();

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showAnalyzeButton, setShowAnalyzeButton] = useState(false);
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Reset response when switching modes
  useEffect(() => {
    setResponse('');
    resetTranscript();
  }, [isImageAnalysisEnabled, selectedMode]);

  // Then in useEffect to sync errors
  useEffect(() => {
    if (aiError) setError(aiError);
  }, [aiError]);

  const addToHistory = (type: 'question' | 'answer', text: string) => {
    setConversationHistory(prev => [...prev, {
      type,
      text,
      timestamp: new Date()
    }]);
  };

  const clearHistory = () => {
    setConversationHistory([]);
    setResponse('');
    resetTranscript();
  };

  const handleAnalyzeImage = async () => {
    if (!webcamRef.current?.video) {
      setResponse(translations.camera.placeholder);
      return;
    }

    try {
      const video = webcamRef.current.video;
      const question = transcript || "What do you see in this image?";
      
      addToHistory('question', question);
      const result = await processAIResponse(question, video);
      
      if (result?.text) {
        setResponse(result.text);
        addToHistory('answer', result.text);
        resetTranscript();
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      setResponse('Failed to analyze image. Please try again.');
    }
  };

  const handleAskQuestion = async () => {
    if (!transcript) {
      setResponse(translations.voice.placeholder);
      return;
    }

    try {
      addToHistory('question', transcript);
      const result = await processAIResponse(transcript);
      
      if (result?.text) {
        setResponse(result.text);
        addToHistory('answer', result.text);
        resetTranscript();
      }
    } catch (err) {
      console.error('Failed to get response:', err);
      setResponse('Failed to get response. Please try again.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setResponse('');
      setError(null);
      setShowAnalyzeButton(false);
      
      // Display the uploaded image
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
      
      setIsLocalLoading(true);
      
      // Convert file to base64 for the API
      const base64Data = await fileToBase64(file);
      
      // Process with properly formatted image data
      const initialResult = await processAIResponse(
        "Briefly describe what's in this image in 1-2 sentences.", 
        {
          inlineData: {
            data: base64Data.split(',')[1],
            mimeType: file.type
          }
        }
      );
      
      if (initialResult?.text) {
        setResponse(initialResult.text);
        addToHistory('question', `Uploaded image: ${initialResult.text}`);
        setShowAnalyzeButton(true);
      }
    } catch (err) {
      console.error('Failed to process image:', err);
      setResponse('Failed to process image. Please try again.');
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleAnalyzeNotes = async () => {
    if (!uploadedImage) return;
    
    try {
      setIsLocalLoading(true);
      
      // Fetch the image data from the URL
      const response = await fetch(uploadedImage);
      const blob = await response.blob();
      const base64Data = await fileToBase64(blob);
      
      const analysisResult = await processAIResponse(
        "This image contains notes or text. Please analyze in detail by: 1) Summarizing the main content, 2) Explaining any concepts present, 3) Providing educational context or corrections if needed.",
        {
          inlineData: {
            data: base64Data.split(',')[1],
            mimeType: blob.type
          }
        }
      );
      
      if (analysisResult?.text) {
        setResponse(analysisResult.text);
        addToHistory('answer', analysisResult.text);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Failed to analyze notes. Please try again.');
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleWhiteboardSubmit = async (imageData: string) => {
    try {
      // Extract base64 data from the data URL
      const base64Data = imageData.split(',')[1];
      
      const result = await processAIResponse(
        'Analyze this drawing and provide feedback and explanations',
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/png'
          }
        }
      );
      
      if (result?.text) {
        setResponse(result.text);
        addToHistory('answer', result.text);
      }
    } catch (err) {
      console.error('Failed to analyze drawing:', err);
      setError('Failed to analyze drawing. Please try again.');
    }
  };

  const handleQuizComplete = (score: number) => {
    addToHistory('answer', `Quiz completed! Score: ${score}`);
  };

  const features = [
    { icon: MessageSquare, text: translations.features.voice },
    { icon: Image, text: translations.features.image },
    { icon: BookOpen, text: translations.features.education },
    { icon: Share2, text: translations.features.history }
  ];

  const modes = [
    { id: 'chat', icon: MessageSquare, label: translations.modes.chat },
    { id: 'quiz', icon: GraduationCap, label: translations.modes.quiz },
    { id: 'whiteboard', icon: PenTool, label: translations.modes.whiteboard },
    { id: 'ocr', icon: FileText, label: translations.modes.ocr }
  ];

  // Helper function to convert File/Blob to base64
  const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <header className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Brain className="w-10 h-10 sm:w-16 sm:h-16 text-indigo-600" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              {translations.title}
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            {translations.description}
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-6 sm:mt-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-3 sm:p-4 shadow-md hover:shadow-lg transition">
                <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 mb-1 sm:mb-2 mx-auto" />
                <p className="text-xs sm:text-sm text-gray-700 text-center">{feature.text}</p>
              </div>
            ))}
          </div>
        </header>

        {/* Mode Selector - Desktop */}
        <div className="hidden sm:flex justify-center gap-2 md:gap-4 mb-6 sm:mb-8">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as Mode)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition ${
                mode === m.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } text-xs sm:text-sm md:text-base`}
            >
              <m.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              {m.label}
            </button>
          ))}
        </div>

        {/* Mode Selector - Mobile */}
        <div className="sm:hidden mb-6">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white rounded-lg shadow text-gray-700"
          >
            <div className="flex items-center gap-2">
              {modes.find(m => m.id === mode)?.icon && (
                <div className="text-indigo-600">
                  {React.createElement(modes.find(m => m.id === mode)?.icon || MessageSquare, { size: 20 })}
                </div>
              )}
              <span>{modes.find(m => m.id === mode)?.label}</span>
            </div>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          {mobileMenuOpen && (
            <div className="mt-2 bg-white rounded-lg shadow-lg overflow-hidden">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id as Mode);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-3 transition ${
                    mode === m.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  } border-b border-gray-100 last:border-none`}
                >
                  <m.icon className="w-5 h-5" />
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full"
        >
          {mode === 'chat' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold">{translations.camera.title}</h2>
                  <button
                    onClick={() => setIsImageAnalysisEnabled(!isImageAnalysisEnabled)}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition text-sm sm:text-base ${
                      isImageAnalysisEnabled ? 'bg-red-600' : 'bg-indigo-600'
                    } text-white hover:opacity-90`}
                  >
                    {isImageAnalysisEnabled ? (
                      <>
                        <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden xs:inline">{translations.camera.disable}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden xs:inline">{translations.camera.enable}</span>
                      </>
                    )}
                  </button>
                </div>
                {isImageAnalysisEnabled ? (
                  <>
                    <div className="relative mb-4 rounded-lg overflow-hidden shadow-inner">
                      <Webcam
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full rounded-lg"
                        videoConstraints={{
                          facingMode: "user",
                          width: { min: 320, ideal: 640, max: 1280 },
                          height: { min: 240, ideal: 480, max: 720 }
                        }}
                      />
                    </div>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={handleAnalyzeImage}
                        disabled={isLoading || isLocalLoading}
                        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-md hover:shadow-lg text-sm sm:text-base"
                      >
                        {isLoading || isLocalLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                            {translations.camera.analyzing}
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                            {translations.camera.analyze}
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-32 sm:h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="text-center">
                      <Camera className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm sm:text-base text-gray-500">{translations.camera.placeholder}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <div className="mb-4 sm:mb-6">
                  <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                    <h2 className="text-lg sm:text-xl font-semibold">{translations.voice.title}</h2>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={isListening ? stopListening : startListening}
                        disabled={isLoading || isLocalLoading}
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition text-sm sm:text-base ${
                          isListening ? 'bg-red-600' : 'bg-indigo-600'
                        } text-white disabled:opacity-50 hover:opacity-90 shadow-md`}
                      >
                        <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                        {isListening ? translations.voice.stop : translations.voice.start}
                      </button>
                      <button
                        onClick={handleAskQuestion}
                        disabled={!transcript || isLoading || isLocalLoading}
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-md text-sm sm:text-base"
                      >
                        <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        {translations.voice.ask}
                      </button>
                    </div>
                  </div>
                  <div className="min-h-[80px] sm:min-h-[100px] bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 shadow-inner">
                    <p className="text-sm sm:text-base text-gray-700">{transcript || translations.voice.placeholder}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold">{translations.response.title}</h2>
                    <button
                      onClick={clearHistory}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-gray-600 hover:text-red-600 transition text-xs sm:text-sm"
                    >
                      <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                      {translations.response.clear}
                    </button>
                  </div>
                  <div className="min-h-[120px] sm:min-h-[150px] bg-gray-50 rounded-lg p-3 sm:p-4 shadow-inner">
                    {isLoading || isLocalLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 animate-spin" />
                      </div>
                    ) : (
                      <p className="text-sm sm:text-base text-gray-700">{response || translations.response.placeholder}</p>
                    )}
                  </div>
                </div>

                {conversationHistory.length > 0 && (
                  <div className="mt-4 sm:mt-6">
                    <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">{translations.response.history}</h3>
                    <div className="max-h-40 sm:max-h-60 overflow-y-auto">
                      {conversationHistory.map((item, index) => (
                        <div
                          key={index}
                          className={`mb-2 p-2 sm:p-3 rounded-lg text-sm ${
                            item.type === 'question' 
                              ? 'bg-indigo-50 text-indigo-700' 
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          <p className="text-xs sm:text-sm">{item.text}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {item.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'quiz' && (
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <input
                  type="text"
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder={translations.quiz.topic}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                />
              </div>
              <QuizSection topic={quizTopic} onComplete={handleQuizComplete} />
            </div>
          )}

          {mode === 'whiteboard' && (
            <Whiteboard onSubmit={handleWhiteboardSubmit} />
          )}

          {mode === 'ocr' && (
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="text-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">{translations.modes.ocr}</h2>
                <p className="text-sm sm:text-base text-gray-600 mb-4">{translations.ocr.placeholder}</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer text-sm sm:text-base"
                >
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  {translations.ocr.upload}
                </label>
              </div>

              {/* Image display */}
              {uploadedImage && (
                <div className="mt-4 text-center">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded notes" 
                    className="max-h-48 sm:max-h-64 max-w-full mx-auto rounded-lg shadow-md" 
                  />
                </div>
              )}

              {/* Analyze button */}
              {showAnalyzeButton && !isLoading && !isLocalLoading && (
                <div className="mt-4 text-center">
                  <button
                    onClick={handleAnalyzeNotes}
                    className="inline-flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base"
                  >
                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
                    Analyze Notes
                  </button>
                </div>
              )}

              <div className="mt-4 sm:mt-6">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold">{translations.response.title}</h2>
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-gray-600 hover:text-red-600 transition text-xs sm:text-sm"
                  >
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                    {translations.response.clear}
                  </button>
                </div>
                <div className="min-h-[120px] sm:min-h-[150px] bg-gray-50 rounded-lg p-3 sm:p-4 shadow-inner">
                  {isLoading || isLocalLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 animate-spin" />
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base text-gray-700">{response || translations.response.placeholder}</p>
                  )}
                </div>
              </div>

              {conversationHistory.length > 0 && (
                <div className="mt-4 sm:mt-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">{translations.response.history}</h3>
                  <div className="max-h-40 sm:max-h-60 overflow-y-auto">
                    {conversationHistory.map((item, index) => (
                      <div
                        key={index}
                        className={`mb-2 p-2 sm:p-3 rounded-lg ${
                          item.type === 'question' 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : 'bg-green-50 text-green-700'
                        }`}
                      >
                        <p className="text-xs sm:text-sm whitespace-pre-wrap">{item.text}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {item.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {error && (
          <div className="mt-4 p-3 sm:p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2 text-sm sm:text-base">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;