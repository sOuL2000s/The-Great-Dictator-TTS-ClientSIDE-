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
        NEUTRAL: { accent: 'text-rose-500', accentBg: 'bg-rose-600' },
        AUTHORITY: { accent: 'text-rose-400', accentBg: 'bg-rose-700' },
        ELEGANT: { accent: 'text-rose-300', accentBg: 'bg-rose-600' },
        MILITARY: { accent: 'text-rose-500', accentBg: 'bg-rose-800' },
        PROFESSOR: { accent: 'text-rose-400', accentBg: 'bg-rose-500' },
        SPOOKY: { accent: 'text-rose-600', accentBg: 'bg-rose-900' },
        BRIGHT: { accent: 'text-rose-400', accentBg: 'bg-rose-500' },
        CALM: { accent: 'text-rose-300', accentBg: 'bg-rose-400' },
        VINTAGE: { accent: 'text-rose-500', accentBg: 'bg-rose-700' },
        DEEP: { accent: 'text-rose-400', accentBg: 'bg-rose-800' },
    }), []);

    // Base themes for dark/light mode
    const BASE_MODE_THEMES = useMemo(() => ({
        dark: {
            bg: 'bg-dictator-dark',
            sidebarBg: 'bg-dictator-sidebar',
            sidebarBorder: 'border-rose-600/20',
            text: 'text-slate-200',
            inputBg: 'bg-[#0f172a]/80',
            inputBorder: 'border-slate-800',
            infoText: 'text-slate-500',
            highlightText: 'text-white',
            buttonSecondaryBg: 'bg-transparent',
            buttonSecondaryHover: 'hover:bg-slate-800/50',
            buttonSecondaryText: 'text-slate-400',
            headerBorder: 'border-slate-800/50',
            logoBg: 'bg-slate-900',
            shadow: 'shadow-2xl shadow-rose-900/10'
        },
        light: {
            bg: 'bg-[#f8fafc]',
            sidebarBg: 'bg-white',
            sidebarBorder: 'border-slate-200',
            text: 'text-slate-900',
            inputBg: 'bg-white',
            inputBorder: 'border-slate-200',
            infoText: 'text-slate-500',
            highlightText: 'text-slate-950',
            buttonSecondaryBg: 'bg-transparent',
            buttonSecondaryHover: 'hover:bg-slate-100',
            buttonSecondaryText: 'text-slate-600',
            headerBorder: 'border-slate-200',
            logoBg: 'bg-white',
            shadow: 'shadow-lg shadow-black/5'
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
            // Use 'auto' behavior instead of 'smooth' when dictating to prevent lag at high speeds
            highlightedWordRef.current.scrollIntoView({
                behavior: 'auto', 
                block: 'center',
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
    // Ensure we are tokenizing the EXACT text that is being sent to the speech engine
    const textToSpeak = useMemo(() => cleanText(selectedText || text), [selectedText, text]);
    
    const tokenData = useMemo(() => {
        if (!textToSpeak) return [];
        const rawTokens = tokenizeText(textToSpeak);
        
        let visualTokens = []; 
        let currentIdx = 0;

        for (const token of rawTokens) {
            const isWord = /\S/.test(token);
            
            visualTokens.push({
                token, 
                isWord, 
                indexStart: currentIdx,
                indexEnd: currentIdx + token.length
            });

            currentIdx += token.length;
        }
        return visualTokens;
    }, [textToSpeak]);


    return (
        <div className={`flex h-screen ${currentTheme.bg} ${currentTheme.text} overflow-hidden relative`}>
            
            {/* Sidebar Controls */}
            
            {/* 1. Desktop Sidebar (Relative, Width controlled by the wrapper) */}
            <div 
                className={`hidden md:flex flex-shrink-0 h-full z-10 relative 
                           transition-all duration-300 ease-in-out 
                           ${currentTheme.sidebarBg} border-r ${isDarkMode ? 'border-rose-600/10' : 'border-slate-200'} 
                           ${isDarkMode ? 'shadow-[4px_0_24px_rgba(0,0,0,0.3)]' : 'shadow-[4px_0_20px_rgba(0,0,0,0.04)]'}
                           ${isControlsOpen ? 'w-1/4 min-w-[300px] max-w-sm' : 'w-12'}`}
                style={isControlsOpen ? { borderRight: `3px solid ${isDarkMode ? '#E11D4822' : '#DC262611'}` } : {}}
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
            <div className="flex-1 flex flex-col p-6 md:p-12 relative max-w-5xl mx-auto w-full h-full overflow-hidden">
                <header className={`flex-shrink-0 mb-8 md:mb-12 flex justify-between items-end flex-wrap gap-4 border-b ${currentTheme.headerBorder} pb-6`}>
                    <div>
                        <h1 className={`text-3xl md:text-4xl font-bold tracking-tight`}>
                            The Great <span className="text-rose-600">Dictator</span>
                        </h1>
                        <p className={`text-sm md:text-base ${currentTheme.infoText} mt-2`}>Commanding clarity, one word at a time.</p>
                    </div>
                    {/* Online Status Indicator */}
                    <div className={`flex items-center text-xs font-semibold px-3 py-1.5 rounded-full border ${currentTheme.headerBorder} backdrop-blur-sm
                                    ${isOnline ? 'text-emerald-500 bg-emerald-500/5' : 'text-rose-500 bg-rose-500/5'}`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.4)]'}`}></span>
                        {isOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
                    </div>
                </header>

                {error && (
                    <div className="flex-shrink-0 bg-rose-500/10 text-rose-400 p-4 rounded-xl mb-6 border border-rose-500/20 backdrop-blur-md flex items-start">
                        <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {/* Text Display/Input Area */}
                
                <div className="flex-1 relative group min-h-0">
                    {isSpeaking ? (
                        // 1. Highlighted Text Display (Read-only)
                        <div 
                            ref={textDisplayRef}
                            className={`h-full w-full p-6 md:p-8 text-lg md:text-xl ${currentTheme.inputBg} rounded-2xl border ${currentTheme.inputBorder} overflow-y-auto font-sans leading-relaxed text-left select-none backdrop-blur-sm transition-all duration-300 shadow-xl shadow-black/20`}
                            style={{ whiteSpace: 'pre-wrap' }}
                        >
                            {tokenData.map((item, mapIndex) => {
                                // Remove CSS transition during dictation to prevent visual lag
                                let highlightClass = '';
                                let isCurrentWord = false;
                                
                                if (item.isWord && currentCharIndex > -1) {
                                    if (currentCharIndex >= item.indexStart && currentCharIndex < item.indexEnd) {
                                        isCurrentWord = true;
                                        highlightClass = `text-white rounded-md px-1 py-0.5 font-semibold bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.4)] ring-2 ring-rose-500/20`;
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
                            className={`h-full w-full p-6 md:p-8 text-lg md:text-xl ${currentTheme.inputBg} rounded-2xl border ${currentTheme.inputBorder} focus:border-rose-600/30 focus:ring-4 focus:ring-rose-600/5 transition-all duration-300 resize-none font-sans leading-relaxed text-left outline-none ${currentTheme.shadow}`}
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
                </div>
                
                {/* Status Message for Selection */}
                {selectedText && !isSpeaking && (
                    <div className={`flex-shrink-0 mt-4 flex items-center p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10`}>
                        <svg className="w-4 h-4 text-indigo-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        <p className={`text-xs md:text-sm ${currentTheme.infoText}`}>
                            Reading Selection: <span className={`font-semibold ${currentTheme.highlightText} italic`}>
                                "{selectedText.length > 60 ? selectedText.substring(0, 60) + '...' : selectedText}"
                            </span>
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex-shrink-0 mt-8 flex flex-wrap gap-4 items-center justify-start">
                    
                    {/* Primary Action: Speak / Pause / Resume */}
                    <button
                        onClick={isSpeaking ? handlePause : () => handleSpeak(false)}
                        disabled={!selectedVoice || (!text && !synth.paused) || isGeneratingAudio}
                        className={`py-3.5 px-8 text-base font-bold rounded-xl transition-all duration-300 min-w-[180px] flex items-center justify-center gap-2 group
                            ${isSpeaking 
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-xl shadow-amber-600/20' 
                                : isPaused
                                    ? 'bg-rose-700 hover:bg-rose-600 text-white shadow-xl shadow-rose-700/20'
                                    : `bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none`}`
                        }
                    >
                        {isSpeaking ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                        )}
                        {isSpeaking ? 'PAUSE' : (isPaused ? 'RESUME' : 'START DICTATION')}
                    </button>

                    {/* Secondary Button: Generate Audio */}
                    <button
                        onClick={handleGenerateAudio}
                        disabled={isSpeaking || isPaused || isGeneratingAudio || (!text && !selectedText)}
                        className={`py-3.5 px-6 text-base font-semibold rounded-xl border-2 transition-all duration-300 min-w-[200px] flex items-center justify-center gap-2
                            ${isGeneratingAudio 
                                ? (isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200')
                                : `bg-transparent ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} hover:border-rose-600 hover:text-rose-600 disabled:opacity-30`}`
                        }
                    >
                        {isGeneratingAudio ? (
                            <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg>
                        )}
                        {isGeneratingAudio ? 'RECORDING...' : 'Generate Audio File'}
                    </button>

                    {/* Danger Action: Stop */}
                    {(isSpeaking || isPaused || isGeneratingAudio) && (
                        <button
                            onClick={handleStop}
                            className={`py-3.5 px-6 text-base font-semibold rounded-xl border-2 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-rose-500/5`}
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"></path></svg>
                            STOP
                        </button>
                    )}
                    
                    {/* Ghost Action: Clear */}
                    <button
                        onClick={() => setText('')}
                        disabled={isSpeaking || isPaused || isGeneratingAudio}
                        className={`py-3.5 px-6 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors duration-200 disabled:opacity-0 underline-offset-4 hover:underline`}
                    >
                        Clear text
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;