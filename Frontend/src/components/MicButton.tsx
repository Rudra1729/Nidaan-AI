import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

interface MicButtonProps {
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  currentLang: string;
}

const MicButton = ({ isListening, onStartListening, onStopListening, currentLang }: MicButtonProps) => {
  const handleClick = () => {
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={handleClick}
        className={`relative w-20 h-20 rounded-full shadow-lg transition-all duration-300 ${
          isListening 
            ? 'bg-accent hover:bg-accent/90 scale-105' 
            : 'bg-primary hover:bg-primary/90 hover:scale-105'
        }`}
        aria-label={isListening ? "Stop recording" : "Start voice recording"}
      >
        {isListening && (
          <div className="absolute inset-0 rounded-full bg-accent/30 animate-pulse-ring pointer-events-none"></div>
        )}
        {isListening ? (
          <MicOff className="w-8 h-8 text-white relative z-10" />
        ) : (
          <Mic className="w-8 h-8 text-white relative z-10" />
        )}
      </Button>
      
      {isListening && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-accent/90 text-white px-3 py-1 rounded-full text-sm font-medium">
            {currentLang === 'en' ? 'Listening...' : 'સાંભળી રહ્યું છે...'}
          </div>
        </div>
      )}
    </div>
  );
};

export default MicButton;