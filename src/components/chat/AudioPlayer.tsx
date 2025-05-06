import React, { useState, useRef, useEffect } from 'react';
import { AudioMessageData } from '../../types/chat';

interface AudioPlayerProps {
  audioData: AudioMessageData;
  dark?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioData, dark = true }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Formatar a duração do áudio em MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Atualizar o progresso durante a reprodução
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);
  
  // Manipular a reprodução
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(error => {
        console.error('Erro ao reproduzir áudio:', error);
      });
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Definir progresso ao clicar na barra
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const progressBar = e.currentTarget;
    const clickPosition = e.clientX - progressBar.getBoundingClientRect().left;
    const progressBarWidth = progressBar.clientWidth;
    const clickPercentage = (clickPosition / progressBarWidth) * 100;
    
    const newTime = (audio.duration * clickPercentage) / 100;
    audio.currentTime = newTime;
    setProgress(clickPercentage);
    setCurrentTime(newTime);
  };
  
  return (
    <div className={`w-full flex flex-col rounded-md p-2 ${dark ? 'bg-[#1E1E1E]' : 'bg-[#f0f0f0]'}`}>
      {/* Áudio invisível */}
      <audio ref={audioRef} src={audioData.url} preload="metadata" />
      
      <div className="flex items-center gap-3 mb-1">
        {/* Botão de reprodução */}
        <button 
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center ${dark ? 'bg-[#383838] hover:bg-[#444]' : 'bg-[#e0e0e0] hover:bg-[#d0d0d0]'}`}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className={dark ? "text-white" : "text-gray-800"} viewBox="0 0 16 16">
              <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className={dark ? "text-white" : "text-gray-800"} viewBox="0 0 16 16">
              <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
            </svg>
          )}
        </button>
        
        {/* Barra de progresso e tempos */}
        <div className="flex-1 flex flex-col">
          <div 
            className={`w-full h-2 rounded-full ${dark ? 'bg-[#383838]' : 'bg-[#e0e0e0]'} cursor-pointer relative`}
            onClick={handleProgressBarClick}
          >
            <div 
              className="h-full rounded-full bg-green-500" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
              {formatTime(currentTime)}
            </span>
            <span className={`text-xs ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
              {formatTime(audioData.seconds)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Indicador de tipo de áudio (PTT) */}
      {audioData.ptt && (
        <div className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'} ml-1`}>
          • Mensagem de voz
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
