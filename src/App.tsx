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
  Lightbulb
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
    error
  } = useAIResponse({ 
    enableVoice: true, 
    enableCamera: isImageAnalysisEnabled
  });

  const [response, setResponse] = useState('');
  const [mode, setMode] = useState<Mode>('chat');
  const [quizTopic, setQuizTopic] = useState('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  
  const { processImage, isProcessing, progress } = useOCRProcessor();

  // Reset response when switching modes
  useEffect(() => {
    setResponse('');
    resetTranscript();
  }, [isImageAnalysisEnabled, selectedMode]);

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
      // Clear previous response and error
      setResponse('');
      setError(null);

      // Process the image
      const result = await processImage(file);
      
      if (result) {
        // Show the recognized text immediately
        setResponse(`Recognized Text (${result.confidence.toFixed(1)}% confidence):\n${result.text}`);
        
        // Add to history
        addToHistory('question', `Processed handwritten text:\n${result.text}`);

        // Create a prompt for AI analysis
        const prompt = `Analyze this text and provide feedback:
"${result.text}"

Please:
1. Summarize the main points
2. Point out any unclear parts
3. Provide relevant educational context or response`;

        // Get AI analysis
        const aiResponse = await processAIResponse(prompt);
        if (aiResponse?.text) {
          setResponse(aiResponse.text);
          addToHistory('answer', aiResponse.text);
        }
      }
    } catch (err) {
      console.error('Failed to process handwriting:', err);
      setError('Failed to process handwriting. Please try a clearer image or check if the image contains text.');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-16 h-16 text-indigo-600" />
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              {translations.title}
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {translations.description}
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition">
                <feature.icon className="w-8 h-8 text-indigo-600 mb-2 mx-auto" />
                <p className="text-sm text-gray-700 text-center">{feature.text}</p>
              </div>
            ))}
          </div>
        </header>

        {/* Mode Selector */}
        <div className="flex justify-center gap-4 mb-8">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as Mode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                mode === m.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <m.icon className="w-5 h-5" />
              {m.label}
            </button>
          ))}
        </div>

        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {mode === 'chat' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">{translations.camera.title}</h2>
                  <button
                    onClick={() => setIsImageAnalysisEnabled(!isImageAnalysisEnabled)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      isImageAnalysisEnabled ? 'bg-red-600' : 'bg-indigo-600'
                    } text-white hover:opacity-90`}
                  >
                    {isImageAnalysisEnabled ? (
                      <>
                        <EyeOff className="w-5 h-5" />
                        {translations.camera.disable}
                      </>
                    ) : (
                      <>
                        <Eye className="w-5 h-5" />
                        {translations.camera.enable}
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
                      />
                    </div>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={handleAnalyzeImage}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-md hover:shadow-lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {translations.camera.analyzing}
                          </>
                        ) : (
                          <>
                            <Camera className="w-5 h-5" />
                            {translations.camera.analyze}
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="text-center">
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">{translations.camera.placeholder}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">{translations.voice.title}</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={isListening ? stopListening : startListening}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                          isListening ? 'bg-red-600' : 'bg-indigo-600'
                        } text-white disabled:opacity-50 hover:opacity-90 shadow-md`}
                      >
                        <Mic className="w-5 h-5" />
                        {isListening ? translations.voice.stop : translations.voice.start}
                      </button>
                      <button
                        onClick={handleAskQuestion}
                        disabled={!transcript || isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-md"
                      >
                        <Volume2 className="w-5 h-5" />
                        {translations.voice.ask}
                      </button>
                    </div>
                  </div>
                  <div className="min-h-[100px] bg-gray-50 rounded-lg p-4 mb-4 shadow-inner">
                    <p className="text-gray-700">{transcript || translations.voice.placeholder}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{translations.response.title}</h2>
                    <button
                      onClick={clearHistory}
                      className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:text-red-600 transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {translations.response.clear}
                    </button>
                  </div>
                  <div className="min-h-[150px] bg-gray-50 rounded-lg p-4 shadow-inner">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      </div>
                    ) : (
                      <p className="text-gray-700">{response || translations.response.placeholder}</p>
                    )}
                  </div>
                </div>

                {conversationHistory.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">{translations.response.history}</h3>
                    <div className="max-h-60 overflow-y-auto">
                      {conversationHistory.map((item, index) => (
                        <div
                          key={index}
                          className={`mb-2 p-3 rounded-lg ${
                            item.type === 'question' 
                              ? 'bg-indigo-50 text-indigo-700' 
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          <p className="text-sm">{item.text}</p>
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
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-6">
                <input
                  type="text"
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder={translations.quiz.topic}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <QuizSection topic={quizTopic} onComplete={handleQuizComplete} />
            </div>
          )}

          {mode === 'whiteboard' && (
            <Whiteboard onSubmit={handleWhiteboardSubmit} />
          )}

          {mode === 'ocr' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-4">{translations.modes.ocr}</h2>
                <p className="text-gray-600 mb-4">{translations.ocr.placeholder}</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  {translations.ocr.upload}
                </label>
                {isProcessing && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{translations.ocr.processing}</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">{translations.response.title}</h2>
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:text-red-600 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {translations.response.clear}
                  </button>
                </div>
                <div className="min-h-[150px] bg-gray-50 rounded-lg p-4 shadow-inner">
                  {isLoading || isProcessing ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                  ) : (
                    <p className="text-gray-700">{response || translations.response.placeholder}</p>
                  )}
                </div>
              </div>

              {conversationHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">{translations.response.history}</h3>
                  <div className="max-h-60 overflow-y-auto">
                    {conversationHistory.map((item, index) => (
                      <div
                        key={index}
                        className={`mb-2 p-3 rounded-lg ${
                          item.type === 'question' 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : 'bg-green-50 text-green-700'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{item.text}</p>
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
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;