import { Button } from '@/components/ui/button';

interface LanguageToggleProps {
  currentLang: string;
  onLanguageChange: (lang: string) => void;
}

const LanguageToggle = ({ currentLang, onLanguageChange }: LanguageToggleProps) => {
  return (
    <div className="flex items-center bg-secondary rounded-lg p-1">
      <Button
        variant={currentLang === 'en' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onLanguageChange('en')}
        className="text-sm font-medium px-3 py-1 h-8"
      >
        EN
      </Button>
      <Button
        variant={currentLang === 'gu' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onLanguageChange('gu')}
        className="text-sm font-medium px-3 py-1 h-8"
      >
        ગુજરાતી
      </Button>
    </div>
  );
};

export default LanguageToggle;