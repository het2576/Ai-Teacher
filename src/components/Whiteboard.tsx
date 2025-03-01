import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import {
  Pencil,
  Square,
  Circle,
  Type,
  Eraser,
  Trash2,
  Download,
  Send
} from 'lucide-react';

interface WhiteboardProps {
  onSubmit: (imageData: string) => void;
  width?: number;
  height?: number;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  onSubmit,
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeMode, setActiveMode] = useState<'draw' | 'shape' | 'text' | 'erase'>('draw');

  useEffect(() => {
    if (canvasRef.current) {
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#fff',
        isDrawingMode: true
      });

      setCanvas(fabricCanvas);

      return () => {
        fabricCanvas.dispose();
      };
    }
  }, [width, height]);

  const setDrawingMode = (mode: typeof activeMode) => {
    if (!canvas) return;

    setActiveMode(mode);
    canvas.isDrawingMode = mode === 'draw';

    if (mode === 'draw') {
      canvas.freeDrawingBrush.width = 2;
      canvas.freeDrawingBrush.color = '#000';
    }
  };

  const addShape = (type: 'rect' | 'circle') => {
    if (!canvas) return;

    const shape = type === 'rect'
      ? new fabric.Rect({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: 'transparent',
          stroke: '#000',
          strokeWidth: 2
        })
      : new fabric.Circle({
          left: 100,
          top: 100,
          radius: 50,
          fill: 'transparent',
          stroke: '#000',
          strokeWidth: 2
        });

    canvas.add(shape);
    canvas.setActiveObject(shape);
  };

  const addText = () => {
    if (!canvas) return;

    const text = new fabric.IText('Type here', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#000'
    });

    canvas.add(text);
    canvas.setActiveObject(text);
  };

  const clearCanvas = () => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = '#fff';
    canvas.renderAll();
  };

  const downloadCanvas = () => {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 0.8
    });
    
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = dataUrl;
    link.click();
  };

  const handleSubmit = () => {
    if (!canvas) return;
    const imageData = canvas.toDataURL({
      format: 'png',
      quality: 0.8
    });
    onSubmit(imageData);
  };

  const tools = [
    { icon: Pencil, mode: 'draw', label: 'Draw' },
    { icon: Square, mode: 'shape', label: 'Rectangle', action: () => addShape('rect') },
    { icon: Circle, mode: 'shape', label: 'Circle', action: () => addShape('circle') },
    { icon: Type, mode: 'text', label: 'Text', action: addText },
    { icon: Eraser, mode: 'erase', label: 'Erase' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex gap-2 mb-4">
        {tools.map((tool, index) => (
          <button
            key={index}
            onClick={() => tool.action ? tool.action() : setDrawingMode(tool.mode as any)}
            className={`p-2 rounded-lg transition ${
              activeMode === tool.mode
                ? 'bg-indigo-100 text-indigo-700'
                : 'hover:bg-gray-100'
            }`}
            title={tool.label}
          >
            <tool.icon className="w-5 h-5" />
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={clearCanvas}
          className="p-2 rounded-lg hover:bg-red-100 hover:text-red-700 transition"
          title="Clear"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <button
          onClick={downloadCanvas}
          className="p-2 rounded-lg hover:bg-green-100 hover:text-green-700 transition"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={handleSubmit}
          className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          title="Submit for Analysis"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}; 