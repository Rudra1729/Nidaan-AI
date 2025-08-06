import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Volume2, VolumeX } from 'lucide-react';

interface ResponseSectionProps {
  userQuery: string;
  aiResponse: string;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  currentLang: string;
}

const ResponseSection = ({ userQuery, aiResponse, isSpeaking, onStopSpeaking, currentLang }: ResponseSectionProps) => {
  if (!aiResponse) return null;

  return (
    <div className="w-full max-w-3xl mx-auto px-6">
      <Card className="p-8 shadow-lg border-0 bg-secondary/30">
        {userQuery && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {currentLang === 'en' ? 'You asked:' : 'તમે પૂછ્યું:'}
            </p>
            <p className="text-foreground italic">"{userQuery}"</p>
          </div>
        )}
        
        <div className="space-y-4">
          <p className="text-lg leading-relaxed text-foreground">
            {aiResponse}
          </p>
          
          {isSpeaking && (
            <div className="flex items-center justify-between bg-accent/10 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <Volume2 className="w-5 h-5 text-accent animate-speaking-pulse" />
                <span className="text-accent font-medium">
                  {currentLang === 'en' ? 'Speaking...' : 'બોલી રહ્યું છે...'}
                </span>
              </div>
              <Button
                onClick={onStopSpeaking}
                variant="outline"
                size="sm"
                className="border-accent text-accent hover:bg-accent hover:text-white"
              >
                <VolumeX className="w-4 h-4 mr-2" />
                {currentLang === 'en' ? 'Stop' : 'બંધ કરો'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ResponseSection;