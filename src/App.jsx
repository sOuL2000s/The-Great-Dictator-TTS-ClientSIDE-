import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import DictatorControls from './components/DictatorControls';

// Custom Hook for Local Storage (for settings and text persistence)
const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            // Handle boolean initialValue specifically to avoid `true` being parsed as "true" string
            if (typeof initialValue === 'boolean' && item !== null) {
                return JSON.parse(item);
            }
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };
    return [storedValue, setValue];
};

// Utility function to clean text for dictation
const cleanText = (rawText) => {
    if (!rawText) return '';
    let clean = rawText.replace(/<[^>]*>/g, ' ');
    clean = clean.replace(/(\*|_|#|`)+/g, ' ');
    clean = clean.replace(/\s\s+/g, ' ').trim();
    return clean;
};

// Utility function to tokenize text for synchronized display
const tokenizeText = (rawText) => {
    // Splits by whitespace but includes whitespace/delimiters in the output array
    return rawText.match(/\S+|\s+/g) || [];
};

const DEFAULT_TEXT = "Greetings, citizen. You have entered the domain of The Great Dictator. Click 'Start Dictation' to begin, or 'Generate Audio File' to capture the speech as a file.";

function App() {
    const textDisplayRef = useRef(null);
    const highlightedWordRef = useRef(null);
    
    // Local Storage Persisted States
    const [text, setText] = useLocalStorage('dictatorText', DEFAULT_TEXT);
    const [selectedVoice, setSelectedVoice] = useLocalStorage('dictatorVoice', null);
    const [rate, setRate] = useLocalStorage('dictatorRate', 1.0);
    const [pitch, setPitch] = useLocalStorage('dictatorPitch', 1.0);
    const [volume, setVolume] = useLocalStorage('dictatorVolume', 1.0);
    const [isControlsOpen, setIsControlsOpen] = useLocalStorage('dictatorControlsOpen', true);
    const [isDarkMode, setIsDarkMode] = useLocalStorage('dictatorDarkMode', true); // New: Dark/Light Mode
    
    // Runtime States
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [voices, setVoices] = useState([]);
    const [error, setError] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine); // New: Online status
    
    // States for synchronization and reading selection
    const [currentCharIndex, setCurrentCharIndex] = useState(-1);
    const [isPaused, setIsPaused] = useState(false);
    const [selectedText, setSelectedText] = useState('');

    const synth = useMemo(() => window.speechSynthesis, []);
    
    // Helper to normalize strings for comparison
    const normalize = (str) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    // Theme Definitions: Voice-based accent themes
    const VOICE_ACCENT_THEMES = useMemo(() => ({
        NEUTRAL: { accent: 'text-dictator-accent', accentBg: 'bg-dictator-accent', headerAccent: 'text-dictator-accent' },
        AUTHORITY: { accent: 'text-cyan-400', accentBg: 'bg-cyan-600', headerAccent: 'text-cyan-400' },
        ELEGANT: { accent: 'text-purple-400', accentBg: 'bg-purple-600', headerAccent: 'text-purple-400' },
        MILITARY: { accent: 'text-green-500', accentBg: 'bg-green-700', headerAccent: 'text-green-400' },
        PROFESSOR: { accent: 'text-yellow-400', accentBg: 'bg-yellow-600', headerAccent: 'text-yellow-400' },
        SPOOKY: { accent: 'text-red-500', accentBg: 'bg-red-700', headerAccent: 'text-red-400' },
        BRIGHT: { accent: 'text-pink-400', accentBg: 'bg-pink-600', headerAccent: 'text-pink-400' },
        CALM: { accent: 'text-sky-300', accentBg: 'bg-sky-600', headerAccent: 'text-sky-300' },
        VINTAGE: { accent: 'text-orange-400', accentBg: 'bg-orange-600', headerAccent: 'text-orange-400' },
        DEEP: { accent: 'text-fuchsia-400', accentBg: 'bg-fuchsia-600', headerAccent: 'text-fuchsia-400' },
    }), []);

    // Base themes for dark/light mode
    const BASE_MODE_THEMES = useMemo(() => ({
        dark: {
            bg: 'bg-dictator-dark',
            sidebarBg: 'bg-dictator-dark',
            text: 'text-dictator-light',
            inputBg: 'bg-slate-800',
            inputBorder: 'border-slate-700',
            infoText: 'text-slate-400',
            highlightText: 'text-white',
            buttonSecondaryBg: 'bg-slate-700',
            buttonSecondaryHover: 'hover:bg-slate-600',
            buttonSecondaryText: 'text-dictator-light',
            headerBorder: 'border-slate-700',
            logoBg: 'bg-slate-800' // For file input
        },
        light: {
            bg: 'bg-dictator-light',
            sidebarBg: 'bg-gray-100',
            text: 'text-dictator-dark',
            inputBg: 'bg-white',
            inputBorder: 'border-gray-300',
            infoText: 'text-gray-600',
            highlightText: 'text-gray-900',
            buttonSecondaryBg: 'bg-gray-200',
            buttonSecondaryHover: 'hover:bg-gray-300',
            buttonSecondaryText: 'text-slate-800',
            headerBorder: 'border-gray-300',
            logoBg: 'bg-gray-50' // For file input
        }
    }), []);

    // Combined theme (base + voice accents)
    const currentTheme = useMemo(() => {
        const modeBase = isDarkMode ? BASE_MODE_THEMES.dark : BASE_MODE_THEMES.light;
        
        let voiceThemeKey = 'NEUTRAL'; // Default voice theme
        const voiceObj = voices.find(v => v.name === selectedVoice);
        if (voiceObj) {
            const lowerName = normalize(voiceObj.name);
            if (lowerName.includes('high') || lowerName.includes('premium') || lowerName.includes('wavenet') || lowerName.includes('google')) {
                voiceThemeKey = 'AUTHORITY';
            } else if (lowerName.includes('female') || lowerName.includes('femenine') || lowerName.includes('alice') || lowerName.includes('samantha')) {
                voiceThemeKey = 'ELEGANT';
            } else if (lowerName.includes('male') || lowerName.includes('default') || lowerName.includes('microsoft')) {
                voiceThemeKey = 'NEUTRAL';
            } else if (lowerName.includes('zira') || lowerName.includes('anna') || lowerName.includes('amy') || lowerName.includes('karen')) {
                voiceThemeKey = 'CALM';
            } else if (lowerName.includes('alex') || lowerName.includes('daniel')) {
                voiceThemeKey = 'DEEP';
            } else if (lowerName.includes('lee') || lowerName.includes('military') || lowerName.includes('commander')) {
                voiceThemeKey = 'MILITARY';
            } else if (lowerName.includes('veena') || lowerName.includes('susan') || lowerName.includes('professor')) {
                voiceThemeKey = 'PROFESSOR';
            } else if (lowerName.includes('chipmunk') || lowerName.includes('ghost') || lowerName.includes('whisper')) {
                voiceThemeKey = 'SPOOKY';
            } else if (lowerName.includes('lucy') || lowerName.includes('bright') || lowerName.includes('sun')) {
                voiceThemeKey = 'BRIGHT';
            } else if (lowerName.includes('vintage') || lowerName.includes('old')) {
                voiceThemeKey = 'VINTAGE';
            }
        }

        const voiceAccent = VOICE_ACCENT_THEMES[voiceThemeKey];

        return {
            ...modeBase,
            ...voiceAccent,
        };
    }, [selectedVoice, voices, isDarkMode, VOICE_ACCENT_THEMES, BASE_MODE_THEMES]);


    // --- Voice Loading ---
    const loadVoices = useCallback(() => {
        const availableVoices = synth.getVoices();
        setVoices(availableVoices);
        if (availableVoices.length > 0 && !selectedVoice) {
            const defaultVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
            setSelectedVoice(defaultVoice ? defaultVoice.name : null);
        }
    }, [synth, selectedVoice, setSelectedVoice]);

    // Error clearing effect
    useEffect(() => {
        // Automatically clear non-critical errors after 5 seconds
        if (error) {
            const errorTimeout = setTimeout(() => {
                // Do not clear the API not supported error
                if (!error.includes("not supported")) {
                    setError(null);
                }
            }, 5000);
            return () => clearTimeout(errorTimeout);
        }
    }, [error]);
    
    // Effect for auto-scrolling to the currently spoken word
    useEffect(() => {
        // Only attempt to scroll if speaking, we have a valid index (> -1), and both refs are present
        if (isSpeaking && currentCharIndex > -1 && highlightedWordRef.current && textDisplayRef.current) {
            highlightedWordRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest', // Ensures the element is visible without jumping too far
                inline: 'nearest'
            });
        }
    }, [currentCharIndex, isSpeaking]);
    
    // Initial voice loading and API support check
    useEffect(() => {
        if (synth) {
            synth.onvoiceschanged = loadVoices;
            const timeoutId = setTimeout(() => {
                loadVoices();
            }, 0);
            return () => clearTimeout(timeoutId);
        } else {
            setTimeout(() => {
                setError("Web Speech Synthesis API is not supported in this browser.");
            }, 0);
        }
    }, [loadVoices, synth]);

    // New: Online/Offline status effect
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handlePause = () => {
        if (synth && synth.speaking && !synth.paused) {
            synth.pause();
            setIsPaused(true);
            setIsSpeaking(false);
            
            if (isGeneratingAudio) {
                setIsGeneratingAudio(false);
                setError("Audio generation cancelled by pause action.");
            }
        }
    };

    const handleResume = () => {
        if (synth && synth.paused) {
            synth.resume();
            setIsPaused(false);
            setIsSpeaking(true); 
        }
    };

    // --- Core Dictation Logic (Modified for Recording and Pause/Resume) ---

    const handleSpeak = (isRecordingAttempt = false) => {
        if (synth && synth.paused) {
            handleResume();
            return;
        }

        const textToUse = selectedText || text;
        if (!synth || !textToUse) return;
        
        synth.cancel(); // Cancel previous speech if not paused

        const voiceObj = voices.find(v => v.name === selectedVoice);
        if (!voiceObj) {
            if (isRecordingAttempt) setIsGeneratingAudio(false);
            return setError("Selected voice not found.");
        }

        // We use the cleaned version for the utterance itself
        const utteranceText = cleanText(textToUse);

        const utterance = new SpeechSynthesisUtterance(utteranceText);
        utterance.voice = voiceObj;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        utterance.onstart = () => {
            setIsSpeaking(true);
            setCurrentCharIndex(0);
        };
        
        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                setCurrentCharIndex(event.charIndex);
            }
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setCurrentCharIndex(-1); // Reset index
            
            if (isRecordingAttempt) {
                setIsGeneratingAudio(false); 
            }
        };
        
        utterance.onerror = (event) => {
            setError(`Speech Error: ${event.error}`);
            setIsSpeaking(false);
            setCurrentCharIndex(-1);
            if (isRecordingAttempt) {
                setIsGeneratingAudio(false);
            }
        };

        synth.speak(utterance);
    };

    const handleStop = () => {
        if (synth) {
            synth.cancel();
            setIsSpeaking(false);
            setIsPaused(false);
            setIsGeneratingAudio(false);
        }
    };
    
    const handleGenerateAudio = () => {
        const textToUse = selectedText || text;
        if (!textToUse) {
            setError("Please enter text before attempting to generate audio.");
            return;
        }
        
        setIsGeneratingAudio(true);
        
        setError("Audio file generation requires replacing the native SpeechSynthesis API with a library that uses the Web Audio API (e.g., a pure JS TTS engine or a serverless cloud API integration) to access raw audio data for file encoding. Functionality not yet implemented.");
        
        setTimeout(() => setIsGeneratingAudio(false), 3000); 
    };

    const handleClearData = () => {
        if (window.confirm("Are you sure you want to clear all saved text, settings, and local storage data?")) {
            localStorage.removeItem('dictatorText');
            localStorage.removeItem('dictatorVoice');
            localStorage.removeItem('dictatorRate');
            localStorage.removeItem('dictatorPitch');
            localStorage.removeItem('dictatorVolume');
            localStorage.removeItem('dictatorControlsOpen');
            localStorage.removeItem('dictatorDarkMode'); // New: Clear dark mode setting
            
            // Reset React states to defaults
            setText(DEFAULT_TEXT);
            setSelectedVoice(null);
            setRate(1.0);
            setPitch(1.0);
            setVolume(1.0);
            setIsControlsOpen(true);
            setIsDarkMode(true); // Reset dark mode to default
            setError(null);
            
            loadVoices(); 
            alert("All local settings and data cleared.");
        }
    };

    // --- File Handling ---
    const handleFileChange = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setText(e.target.result);
        reader.onerror = () => setError("Error reading file.");
        reader.readAsText(file);
    };

    // --- Memoized Indexing for Highlighting ---
    const textToHighlight = selectedText || text;
    
    const accentClass = currentTheme.accentBg.replace('bg-', '');

    const tokenData = useMemo(() => {
        if (!textToHighlight) return [];
        const rawTokens = tokenizeText(textToHighlight);
        
        let visualTokens = []; 
        let currentCleanIndex = 0;

        for (const token of rawTokens) {
            const isWord = /\S/.test(token);
            const cleanedToken = isWord ? cleanText(token) : '';

            visualTokens.push({
                token, 
                isWord, 
                cleanIndexStart: currentCleanIndex,
                cleanLength: cleanedToken.length
            });

            if (isWord && cleanedToken.length > 0) {
                currentCleanIndex += cleanedToken.length + 1; 
            }
        }
        return visualTokens;
    }, [textToHighlight]);


    return (
        <div className={`flex h-screen ${currentTheme.bg} ${currentTheme.text} overflow-hidden relative`}>
            
            {/* Sidebar Controls */}
            
            {/* 1. Desktop Sidebar (Relative, Width controlled by the wrapper) */}
            <div 
                className={`hidden md:flex flex-shrink-0 h-full z-10 relative 
                           transition-all duration-300 ease-in-out 
                           ${currentTheme.sidebarBg} border-r ${currentTheme.headerBorder} 
                           ${isControlsOpen ? 'w-1/4 min-w-[300px] max-w-sm' : 'w-12'}`}
            >
                <div className={`h-full ${isControlsOpen ? 'w-full' : 'hidden'} overflow-y-auto`}>
                    <DictatorControls
                        voices={voices}
                        selectedVoice={selectedVoice}
                        onVoiceChange={setSelectedVoice}
                        rate={rate}
                        onRateChange={setRate}
                        pitch={pitch}
                        onPitchChange={setPitch}
                        volume={volume}
                        onVolumeChange={setVolume}
                        onFileChange={handleFileChange}
                        onClearData={handleClearData}
                        theme={currentTheme}
                        isDarkMode={isDarkMode}
                        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
                    />
                </div>
                
                {/* Desktop Toggle Button */}
                <button
                    onClick={() => setIsControlsOpen(prev => !prev)}
                    className={`absolute top-4 ${isControlsOpen ? '-right-4' : 'right-0'} 
                                p-2 ${currentTheme.accentBg} hover:opacity-90 ${currentTheme.highlightText} rounded-full shadow-lg transition-all duration-300 z-30 hidden md:block`}
                    aria-label={isControlsOpen ? "Collapse Controls" : "Expand Controls"}
                >
                    {isControlsOpen ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                    )}
                </button>
            </div>
            
            {/* 2. Mobile Sidebar (Fixed Overlay) */}
            <div 
                className={`fixed top-0 left-0 w-[300px] h-full z-30 transition-transform duration-300 ease-in-out 
                           ${isControlsOpen ? 'translate-x-0' : '-translate-x-full'} 
                           ${currentTheme.sidebarBg} shadow-2xl md:hidden`}
            >
                <DictatorControls
                    voices={voices}
                    selectedVoice={selectedVoice}
                    onVoiceChange={setSelectedVoice}
                    rate={rate}
                    onRateChange={setRate}
                    pitch={pitch}
                    onPitchChange={setPitch}
                    volume={volume}
                    onVolumeChange={setVolume}
                    onFileChange={handleFileChange}
                    onClearData={handleClearData}
                    theme={currentTheme}
                    isDarkMode={isDarkMode}
                    onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
                />
                {/* Mobile Close Button (inside the sidebar) */}
                <button
                    onClick={() => setIsControlsOpen(false)}
                    className={`absolute top-4 right-4 p-2 ${currentTheme.accentBg} hover:opacity-90 ${currentTheme.highlightText} rounded-full shadow-lg transition-all duration-300 z-40`}
                    aria-label="Collapse Controls"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                </button>
            </div>
            
            {/* Mobile Overlay */}
            {isControlsOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsControlsOpen(false)}
                ></div>
            )}
            
            {/* Floating Toggle Button for Mobile (Always visible outside the fixed sidebar) */}
            {!isControlsOpen && (
                <button
                    onClick={() => setIsControlsOpen(true)}
                    className={`fixed top-4 right-4 p-2 ${currentTheme.accentBg} hover:opacity-90 ${currentTheme.highlightText} rounded-full shadow-lg transition-all duration-300 z-40 md:hidden`}
                    aria-label="Expand Controls"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
            )}

            {/* Main Dictation Area */}
            <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto relative">
                <header className="mb-4 md:mb-6 flex justify-between items-center flex-wrap gap-2">
                    <div>
                        <h1 className={`text-4xl md:text-5xl font-extrabold ${currentTheme.headerAccent}`}>The Great Dictator</h1>
                        <p className={`text-sm md:text-md ${currentTheme.infoText} mt-1`}>Commanding clarity, one word at a time.</p>
                    </div>
                    {/* New: Online Status Indicator */}
                    <div className={`flex items-center text-sm font-medium p-2 rounded-lg 
                                    ${isOnline ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        <span className="mr-2">
                            {isOnline ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                            )}
                        </span>
                        {isOnline ? 'Online' : 'Offline'}
                    </div>
                </header>

                {error && (
                    <div className="bg-red-900 p-3 rounded mb-4 border border-red-600">
                        ERROR: {error}
                    </div>
                )}

                {/* Text Display/Input Area */}
                
                {isSpeaking ? (
                    // 1. Highlighted Text Display (Read-only)
                    <div 
                        ref={textDisplayRef}
                        className={`flex-1 w-full p-4 text-lg ${currentTheme.inputBg} rounded-lg border-2 ${currentTheme.inputBorder} overflow-y-auto font-mono text-left select-none`}
                        style={{ whiteSpace: 'pre-wrap' }}
                    >
                        {tokenData.map((item, mapIndex) => {
                            let highlightClass = '';
                            let isCurrentWord = false;
                            
                            if (item.isWord && currentCharIndex > -1) {
                                const start = item.cleanIndexStart;
                                const end = item.cleanIndexStart + item.cleanLength;
                                
                                if (currentCharIndex >= start && currentCharIndex < end) {
                                    isCurrentWord = true;
                                    highlightClass = `${currentTheme.highlightText} rounded px-0.5 font-semibold underline decoration-wavy decoration-${accentClass} decoration-2 bg-${accentClass}/30`;
                                }
                            }
                            
                            return (
                                <span 
                                    key={mapIndex} 
                                    className={highlightClass}
                                    ref={isCurrentWord ? highlightedWordRef : null}
                                >
                                    {item.token}
                                </span>
                            );
                        })}
                    </div>
                ) : (
                    // 2. Editable Text Input
                    <textarea
                        className={`flex-1 w-full p-4 text-lg ${currentTheme.inputBg} rounded-lg border-2 ${currentTheme.inputBorder} focus:border-${accentClass} transition duration-200 resize-none font-mono text-left`}
                        placeholder="Enter the text to be dictated..."
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            setSelectedText(''); // Clear selection on edit
                        }}
                        onMouseUp={(e) => {
                            const textarea = e.target;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            
                            if (start !== end) {
                                const selected = text.substring(start, end);
                                setSelectedText(selected);
                            } else {
                                setSelectedText('');
                            }
                        }}
                    />
                )}
                
                {/* Status Message for Selection */}
                {selectedText && !isSpeaking && (
                    <p className={`mt-2 text-sm ${currentTheme.infoText}`}>
                        Selected text ready for dictation: <span className={`font-semibold ${currentTheme.highlightText} italic`}>
                            "{selectedText.length > 80 ? selectedText.substring(0, 80) + '...' : selectedText}"
                        </span>
                    </p>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex flex-wrap gap-4 items-center">
                    
                    {/* Speak / Pause / Resume Button */}
                    <button
                        onClick={isSpeaking ? handlePause : () => handleSpeak(false)}
                        disabled={!selectedVoice || (!text && !synth.paused) || isGeneratingAudio}
                        className={`py-3 px-8 text-xl font-bold rounded-lg transition duration-200 min-w-[180px] 
                            ${isSpeaking 
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg shadow-yellow-600/50' 
                                : isPaused
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/50'
                                    : `${currentTheme.accentBg} hover:opacity-90 ${currentTheme.highlightText} shadow-lg shadow-rose-600/50`}`
                        }
                    >
                        {isSpeaking ? 'PAUSE' : (isPaused ? 'RESUME DICTATION' : 'START DICTATION')}
                    </button>

                    {/* Stop Button (appears when speaking or paused or generating audio) */}
                    {(isSpeaking || isPaused || isGeneratingAudio) && (
                        <button
                            onClick={handleStop}
                            className={`py-3 px-6 text-lg font-semibold rounded-lg bg-red-600 hover:bg-red-700 ${currentTheme.highlightText} shadow-md shadow-red-600/50`}
                        >
                            STOP
                        </button>
                    )}
                    
                    <button
                        onClick={() => setText('')}
                        disabled={isSpeaking || isPaused || isGeneratingAudio}
                        className={`py-3 px-6 text-lg font-semibold rounded-lg ${currentTheme.buttonSecondaryBg} ${currentTheme.buttonSecondaryHover} ${currentTheme.buttonSecondaryText} disabled:opacity-50`}
                    >
                        Clear Text
                    </button>
                    
                    {/* New Generate Audio Button */}
                    <button
                        onClick={handleGenerateAudio}
                        disabled={isSpeaking || isPaused || isGeneratingAudio || (!text && !selectedText)}
                        className={`py-3 px-6 text-lg font-semibold rounded-lg transition duration-200 min-w-[180px] 
                            ${isGeneratingAudio 
                                ? 'bg-indigo-800 text-white cursor-not-allowed'
                                : `bg-green-600 hover:bg-green-700 ${currentTheme.highlightText} shadow-md shadow-green-600/50 disabled:opacity-50`}`
                        }
                    >
                        {isGeneratingAudio ? 'RECORDING (Dictating)' : 'Generate Audio File'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;