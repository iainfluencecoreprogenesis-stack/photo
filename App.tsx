
import React, { useState, useRef, useEffect } from 'react';
import { TourState, LandmarkInfo, DetailedHistory } from './types';
import { identifyLandmark, researchLandmark, narrateHistory } from './geminiService';
import { fileToBase64, decodeBase64, decodeAudioData } from './utils';
import { 
  CameraIcon, 
  MapPinIcon, 
  BookOpenIcon, 
  SpeakerWaveIcon, 
  ArrowPathIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
  XMarkIcon,
  ShareIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [state, setState] = useState<TourState>({
    image: null,
    landmark: null,
    history: null,
    audioBuffer: null,
    loadingStage: 'idle',
    error: null
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
  };

  const triggerHaptic = (intensity: number[] = [50]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(intensity);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic([40, 30, 40]);
    setState(prev => ({ ...prev, loadingStage: 'identifying', image: null, error: null }));
    initAudioContext();

    try {
      const base64 = await fileToBase64(file);
      setState(prev => ({ ...prev, image: `data:image/jpeg;base64,${base64}` }));

      const landmark = await identifyLandmark(base64);
      setState(prev => ({ ...prev, landmark, loadingStage: 'researching' }));

      const history = await researchLandmark(landmark.name);
      setState(prev => ({ ...prev, history, loadingStage: 'narrating' }));

      const audioBase64 = await narrateHistory(`${landmark.name}. ${history.fullStory}`);
      const audioData = decodeBase64(audioBase64);
      const buffer = await decodeAudioData(audioData, audioContextRef.current!);
      
      setState(prev => ({ ...prev, audioBuffer: buffer, loadingStage: 'ready' }));
      playNarration(buffer);
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, loadingStage: 'idle' }));
    }
  };

  const playNarration = (buffer: AudioBuffer) => {
    if (!audioContextRef.current) return;
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch(e) {}
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start();
    audioSourceRef.current = source;
  };

  const resetTour = () => {
    triggerHaptic([20]);
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch(e) {}
    }
    setState({
      image: null,
      landmark: null,
      history: null,
      audioBuffer: null,
      loadingStage: 'idle',
      error: null
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#020617] text-slate-50 overflow-hidden">
      
      {/* AppBar Nativa */}
      <header className="pt-[env(safe-area-inset-top)] bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="px-6 h-14 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">VisionTour AI</h1>
          </div>
          <div className="flex items-center gap-1">
            {state.image && (
              <button 
                onClick={resetTour} 
                className="p-2.5 text-slate-400 active:bg-white/10 rounded-full transition-all ripple-effect"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 scroll-content relative">
        {/* Landing Android M3 */}
        {state.loadingStage === 'idle' && !state.error && (
          <div className="h-full flex flex-col items-center justify-center px-12 text-center animate-in fade-in zoom-in-95 duration-700">
            <div className="relative mb-12">
              <div className="w-36 h-36 bg-blue-600/10 rounded-[48px] flex items-center justify-center border border-blue-500/20 shadow-2xl">
                 <CameraIcon className="w-20 h-20 text-blue-500" />
              </div>
              <div className="absolute -top-4 -right-4 bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-[#020617] shadow-xl">
                 <GlobeAltIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className="text-4xl font-black mb-6 leading-[1.1] tracking-tighter">Tu mundo,<br/>ahora con voz.</h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed mb-12">
              Apunta, captura y deja que la Inteligencia Artificial te cuente la historia de cada rincón.
            </p>
          </div>
        )}

        {/* Loading Material Design */}
        {['identifying', 'researching', 'narrating'].includes(state.loadingStage) && (
          <div className="absolute inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center p-12">
            <div className="w-24 h-24 relative mb-10">
              <div className="absolute inset-0 border-[6px] border-blue-500/10 rounded-full"></div>
              <div className="absolute inset-0 border-[6px] border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-blue-500 font-black tracking-[0.2em] uppercase text-xs mb-3">{state.loadingStage}</p>
            <h3 className="text-xl font-bold text-white text-center">Gemini está analizando tu captura...</h3>
          </div>
        )}

        {/* Vista AR y Resultados */}
        {state.image && !state.error && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
            <div className="relative w-full aspect-[3/4] overflow-hidden bg-black shadow-2xl">
              <img src={state.image} className="w-full h-full object-cover" alt="Capture" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-black/20"></div>
              
              {/* Marcadores POI */}
              {state.landmark?.pointsOfInterest.map((poi, idx) => (
                <div 
                  key={idx} 
                  className="absolute"
                  style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
                >
                  <div className="ar-pulse w-10 h-10 bg-blue-500/50 rounded-full border-2 border-white flex items-center justify-center shadow-xl">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 -mt-24 relative z-10">
              <div className="android-card-m3 p-8 mb-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <SpeakerWaveIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black leading-tight tracking-tight">{state.landmark?.name}</h3>
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-1">Guía IA Activa</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="text-slate-300 leading-relaxed text-lg font-medium border-l-4 border-blue-600/30 pl-6 py-1">
                    {state.history?.fullStory}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-black text-sm uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4" /> Puntos clave
                    </h4>
                    {state.landmark?.pointsOfInterest.map((poi, i) => (
                      <div key={i} className="bg-white/5 p-5 rounded-3xl border border-white/5 ripple-effect">
                        <p className="font-black text-blue-400 mb-1">{poi.label}</p>
                        <p className="text-sm text-slate-400 font-medium leading-relaxed">{poi.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <ExclamationCircleIcon className="w-20 h-20 text-red-500/30 mb-6" />
            <h3 className="text-2xl font-bold mb-4">Error de Red</h3>
            <p className="text-slate-400 mb-10 text-lg leading-relaxed">{state.error}</p>
            <button 
              onClick={resetTour} 
              className="w-full max-w-xs bg-white text-slate-950 font-black py-5 rounded-[24px] shadow-xl active:scale-95 transition-transform"
            >
              Reintentar Captura
            </button>
          </div>
        )}
      </div>

      {/* FAB - Floating Action Button (Estilo M3) */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 z-50 pointer-events-none flex justify-center pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md pointer-events-auto">
          {state.loadingStage === 'idle' ? (
            <label className="flex items-center justify-center gap-4 w-full bg-blue-600 active:bg-blue-700 text-white p-6 rounded-[32px] font-black shadow-[0_20px_50px_rgba(37,99,235,0.4)] transition-all transform active:scale-[0.97] ripple-effect">
              <CameraIcon className="w-8 h-8" />
              <span className="text-xl">Tomar Foto</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
            </label>
          ) : (
            <div className="flex gap-3">
               <button 
                onClick={resetTour}
                className="p-6 bg-slate-900 border border-white/10 rounded-[32px] text-white flex-1 font-black flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <ArrowPathIcon className="w-6 h-6" />
                Nueva
              </button>
              {state.audioBuffer && (
                <button 
                  onClick={() => playNarration(state.audioBuffer!)}
                  className="p-6 bg-blue-600 rounded-[32px] text-white flex-[2] font-black flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl"
                >
                  <SpeakerWaveIcon className="w-6 h-6" />
                  Repetir
                </button>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
