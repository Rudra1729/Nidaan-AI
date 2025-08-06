
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Globe, Wifi, Shield, Users, Mic, Stethoscope, Star, Linkedin } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import MicButton from '@/components/MicButton';
import ResponseSection from '@/components/ResponseSection';
import { translations, getTranslation } from '@/utils/translations';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

const Index = () => {
  const [currentLang, setCurrentLang] = useState('en');
  const [userQuery, setUserQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const speechLang = currentLang === 'en' ? 'en-US' : 'gu-IN';
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition(speechLang);
  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis(speechLang);
  const API_BASE_URL = 'https://nidaan-ai-backend-311709302102.asia-south1.run.app';

  // Handle transcript changes
  useEffect(() => {
    const sendToBackend = async (message: string) => {
      setLoading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append('message', message);
        formData.append('generate_audio', 'true');
        formData.append('lang', currentLang);
        // Optionally, you can send history as well if you want to support multi-turn
        // formData.append('history', JSON.stringify([]));
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Failed to get response from backend');
        const data = await response.json();
        // The backend returns { history: [...] }, so get the last message
        const last = Array.isArray(data.history) && data.history.length > 0 ? data.history[data.history.length - 1] : '';
        setAiResponse(typeof last === 'string' ? last : JSON.stringify(last));
        speak(typeof last === 'string' ? last : JSON.stringify(last));
      } catch (err: any) {
        setError('Error contacting backend: ' + (err.message || err));
        setAiResponse('');
      } finally {
        setLoading(false);
        resetTranscript();
      }
    };
    if (transcript) {
      setUserQuery(transcript);
      sendToBackend(transcript);
    }
  }, [transcript, currentLang, speak, resetTranscript]);

  // helper kept outside the component so the object is re-used
  const chooseMimeType = (): string => {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      return 'audio/webm;codecs=opus';
    }
    // Fallback that Safari (≥14.1) accepts
    return 'audio/mp4';
  };

  const handleStartRecording = () => {
    // ---------- must run in the same click / tap ---------
    setError(null);
    setAiResponse('');
    setUserQuery('');
    setAudioChunks([]);

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mimeType = chooseMimeType();
        const recorder = new MediaRecorder(stream, { mimeType });
        setMediaRecorder(recorder);

        const chunks: Blob[] = [];

        recorder.addEventListener('dataavailable', e => {
          if (e.data.size) chunks.push(e.data);
        });

        recorder.addEventListener('stop', async () => {
          try {
            setLoading(true);

            const audioBlob = new Blob(chunks, { type: mimeType });
            const formData  = new FormData();
            formData.append('audio', audioBlob, `audio.${mimeType.includes('webm') ? 'webm' : 'mp4'}`);
            formData.append('generate_audio', 'true');
            formData.append('lang', currentLang);

            const response = await fetch(`${API_BASE_URL}/api/audio-chat`, {
              method: 'POST',
              body:   formData,
            });

            if (!response.ok) {
              throw new Error(`Backend responded ${response.status}`);
            }

            const data  = await response.json();
            const last  = Array.isArray(data.history) && data.history.length
                            ? data.history[data.history.length - 1]
                            : '';
            const reply = typeof last === 'string'
                            ? last
                            : last?.content ?? JSON.stringify(last);

            setAiResponse(reply);
            setUserQuery('');

            // SAFARI AUTOPLAY RULE: create <audio>, set autoplay, then set src
            if (data.audio_url) {
              const player     = new Audio();
              player.autoplay  = true;
              player.src       = `${API_BASE_URL}${data.audio_url.startsWith('/') ? '' : '/'}${data.audio_url}`;
              audioPlayerRef.current = player;
            }
          } catch (err: any) {
            setError(`Error contacting backend: ${err.message ?? err}`);
            setAiResponse('');
          } finally {
            setLoading(false);
          }
        });

        recorder.start();                // <— finally start recording
      })
      .catch(err => {
        setError(`Could not start audio recording: ${err.message}`);
      });
  };


  const handleStopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
  };

  const handleLanguageChange = (lang: string) => {
    setCurrentLang(lang);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Stethoscope className="w-8 h-8 text-primary" />
              <h1 className="font-display font-bold text-2xl text-foreground">
                {getTranslation(currentLang, 'brand')}
              </h1>
            </div>
            <LanguageToggle currentLang={currentLang} onLanguageChange={handleLanguageChange} />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display font-bold text-4xl lg:text-6xl text-foreground mb-6 animate-fade-in">
              {getTranslation(currentLang, 'heroTitle')}
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto">
              {getTranslation(currentLang, 'heroSubtitle')}
            </p>
            
            {/* Voice Interface */}
            <div className="space-y-8">
              <div className="flex justify-center">
                <MicButton
                  isListening={!!mediaRecorder}
                  onStartListening={handleStartRecording}
                  onStopListening={handleStopRecording}
                  currentLang={currentLang}
                />
              </div>
              
              <p className="text-lg text-muted-foreground">
                {getTranslation(currentLang, 'instructionText')}
              </p>
              
            </div>
          </div>
        </div>
      </section>

      {/* AI Response Section */}
      <section className="py-16">
        <div className="container mx-auto">
          <ResponseSection
            userQuery={userQuery}
            aiResponse={aiResponse}
            isSpeaking={isSpeaking}
            onStopSpeaking={stopSpeaking}
            currentLang={currentLang}
          />
          {loading && (
            <div className="text-center text-muted-foreground mt-4">Loading response...</div>
          )}
          {error && (
            <div className="text-center text-red-500 mt-4">{error}</div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="pt-8 pb-16 gradient-subtle">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl lg:text-4xl text-foreground mb-4">
              {getTranslation(currentLang, 'featuresTitle')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {getTranslation(currentLang, 'featuresSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                titleKey: 'features.multilingual.title',
                descriptionKey: 'features.multilingual.description',
                color: 'bg-healthcare-teal-600'
              },
              {
                icon: Wifi,
                titleKey: 'features.offline.title',
                descriptionKey: 'features.offline.description',
                color: 'bg-healthcare-sky-600'
              },
              {
                icon: Mic,
                titleKey: 'features.voice.title',
                descriptionKey: 'features.voice.description',
                color: 'bg-primary'
              },
              {
                icon: Shield,
                titleKey: 'features.secure.title',
                descriptionKey: 'features.secure.description',
                color: 'bg-healthcare-teal-700'
              },
              {
                icon: Users,
                titleKey: 'features.accessible.title',
                descriptionKey: 'features.accessible.description',
                color: 'bg-healthcare-amber-600'
              },
              {
                icon: Stethoscope,
                titleKey: 'features.trusted.title',
                descriptionKey: 'features.trusted.description',
                color: 'bg-healthcare-sky-500'
              }
            ].map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-card">
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 mx-auto rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="font-display font-bold text-xl text-foreground">
                    {getTranslation(currentLang, feature.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-muted-foreground leading-relaxed">
                    {getTranslation(currentLang, feature.descriptionKey)}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl lg:text-4xl text-foreground mb-4">
              {getTranslation(currentLang, 'testimonialsTitle')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {getTranslation(currentLang, 'testimonialsSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {translations[currentLang as keyof typeof translations].testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg bg-card hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-healthcare-amber-500 text-healthcare-amber-500" />
                    ))}
                  </div>
                  <CardTitle className="font-display font-semibold text-lg text-foreground">
                    {testimonial.name}
                  </CardTitle>
                  <CardDescription className="text-primary font-medium">
                    {testimonial.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed italic">
                    "{testimonial.text}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Creators Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            {getTranslation(currentLang, 'creatorsTitle')}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Nithun Sundarrajan Card */}
            <a
              href="https://www.linkedin.com/in/nithun-sundarrajan-451128269/"
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 p-6 rounded-xl cursor-pointer">
                <CardContent className="p-0">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-foreground">
                      {getTranslation(currentLang, 'creators.nithun.name')}
                    </h3>
                    <Linkedin className="w-5 h-5 text-healthcare-sky-600 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {getTranslation(currentLang, 'creators.nithun.desc')}
                  </p>
                </CardContent>
              </Card>
            </a>

            {/* Rudra Patel Card */}
            <a
              href="https://www.linkedin.com/in/rudra-patel-9440431ba/"
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 p-6 rounded-xl cursor-pointer">
                <CardContent className="p-0">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-foreground">
                      {getTranslation(currentLang, 'creators.rudra.name')}
                    </h3>
                    <Linkedin className="w-5 h-5 text-healthcare-sky-600 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {getTranslation(currentLang, 'creators.rudra.desc')}
                  </p>
                </CardContent>
              </Card>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 gradient-healthcare">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h2 className="font-display font-bold text-3xl lg:text-4xl text-white mb-6">
              {getTranslation(currentLang, 'footerTitle')}
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              {getTranslation(currentLang, 'footerSubtitle')}
            </p>
            
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 px-12 py-6 text-xl rounded-xl shadow-2xl transition-all duration-300 hover:scale-105"
            >
              {getTranslation(currentLang, 'footerCta')}
            </Button>

            <Separator className="my-12 bg-white/20" />

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-white/80">
              <div className="font-display font-semibold text-lg">
                <span className="text-white">
                  {getTranslation(currentLang, 'brand')}
                </span>
              </div>
              <p className="text-center">
                {getTranslation(currentLang, 'footerNote')}
              </p>
              <p className="text-sm">
                {getTranslation(currentLang, 'copyright')}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
