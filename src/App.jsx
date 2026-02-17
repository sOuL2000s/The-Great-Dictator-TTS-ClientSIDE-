import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import DictatorControls from './components/DictatorControls';

// Custom Hook for Local Storage (for settings and text persistence)
const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
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
    const [volume, setVolume] = useLocalStorage('dictatorVolume', 1.0); // New Volume Control
    const [isControlsOpen, setIsControlsOpen] = useLocalStorage('dictatorControlsOpen', true); // Sidebar state persistence
    
    // Runtime States
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false); // State for audio file generation
    const [voices, setVoices] = useState([]);
    const [error, setError] = useState(null);
    
    // States for synchronization and reading selection
    const [currentCharIndex, setCurrentCharIndex] = useState(-1);
    const [isPaused, setIsPaused] = useState(false);
    const [selectedText, setSelectedText] = useState('');

    const synth = useMemo(() => window.speechSynthesis, []);
    
    // Theme Definitions (using custom and standard Tailwind classes)
    const THEMES = useMemo(() => ({
        NEUTRAL: { name: 'Neutral', bg: 'bg-dictator-dark', text: 'text-dictator-light', accent: 'text-dictator-accent', accentBg: 'bg-dictator-accent', headerAccent: 'text-dictator-accent' },
        AUTHORITY: { name: 'Authority', bg: 'bg-slate-950', text: 'text-gray-200', accent: 'text-cyan-400', accentBg: 'bg-cyan-600', headerAccent: 'text-cyan-400' },
        ELEGANT: { name: 'Elegant', bg: 'bg-gray-900', text: 'text-white', accent: 'text-purple-400', accentBg: 'bg-purple-600', headerAccent: 'text-purple-400' },
        MILITARY: { name: 'Military', bg: 'bg-zinc-950', text: 'text-green-300', accent: 'text-green-500', accentBg: 'bg-green-700', headerAccent: 'text-green-400' },
        PROFESSOR: { name: 'Professor', bg: 'bg-blue-950', text: 'text-blue-200', accent: 'text-yellow-400', accentBg: 'bg-yellow-600', headerAccent: 'text-yellow-400' },
        SPOOKY: { name: 'Spooky', bg: 'bg-gray-800', text: 'text-red-300', accent: 'text-red-500', accentBg: 'bg-red-700', headerAccent: 'text-red-400' },
        BRIGHT: { name: 'Bright', bg: 'bg-yellow-950', text: 'text-amber-100', accent: 'text-pink-400', accentBg: 'bg-pink-600', headerAccent: 'text-pink-400' },
        CALM: { name: 'Calm', bg: 'bg-blue-900', text: 'text-blue-100', accent: 'text-sky-300', accentBg: 'bg-sky-600', headerAccent: 'text-sky-300' },
        VINTAGE: { name: 'Vintage', bg: 'bg-neutral-800', text: 'text-yellow-50', accent: 'text-orange-400', accentBg: 'bg-orange-600', headerAccent: 'text-orange-400' },
        DEEP: { name: 'Deep', bg: 'bg-slate-900', text: 'text-fuchsia-200', accent: 'text-fuchsia-400', accentBg: 'bg-fuchsia-600', headerAccent: 'text-fuchsia-400' },
    }), []);
    
    // Helper to normalize strings for comparison
    const normalize = (str) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    const currentTheme = useMemo(() => {
        const voiceObj = voices.find(v => v.name === selectedVoice);
        
        if (!voiceObj) return THEMES.NEUTRAL;
        
        const lowerName = normalize(voiceObj.name);

        if (lowerName.includes('high') || lowerName.includes('premium') || lowerName.includes('wavenet') || lowerName.includes('google')) {
             return THEMES.AUTHORITY; 
        }
        
        if (lowerName.includes('female') || lowerName.includes('femenine') || lowerName.includes('alice') || lowerName.includes('samantha')) {
            return THEMES.ELEGANT;
        }

        if (lowerName.includes('male') || lowerName.includes('default') || lowerName.includes('microsoft')) {
            return THEMES.NEUTRAL;
        }

        if (lowerName.includes('zira') || lowerName.includes('anna') || lowerName.includes('amy') || lowerName.includes('karen')) {
            return THEMES.CALM;
        }
        
        if (lowerName.includes('alex') || lowerName.includes('daniel')) {
            return THEMES.DEEP;
        }
        
        if (lowerName.includes('lee') || lowerName.includes('military') || lowerName.includes('commander')) {
            return THEMES.MILITARY;
        }

        if (lowerName.includes('veena') || lowerName.includes('susan') || lowerName.includes('professor')) {
            return THEMES.PROFESSOR;
        }
        
        if (lowerName.includes('chipmunk') || lowerName.includes('ghost') || lowerName.includes('whisper')) {
            return THEMES.SPOOKY;
        }
        
        if (lowerName.includes('lucy') || lowerName.includes('bright') || lowerName.includes('sun')) {
            return THEMES.BRIGHT;
        }
        
        if (lowerName.includes('vintage') || lowerName.includes('old')) {
            return THEMES.VINTAGE;
        }


        return THEMES.NEUTRAL;
    }, [selectedVoice, voices, THEMES]);



    // --- Voice Loading (Same as before) ---
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
    
    useEffect(() => {
        if (synth) {
            synth.onvoiceschanged = loadVoices;
            // Schedule initial voice loading asynchronously to avoid synchronous setState warning
            // for browsers that load voices immediately.
            const timeoutId = setTimeout(() => {
                loadVoices();
            }, 0);

            return () => clearTimeout(timeoutId);
        } else {
            // Asynchronously set error to satisfy React hook linter regarding synchronous setState in effect body
            setTimeout(() => {
                setError("Web Speech Synthesis API is not supported in this browser.");
            }, 0);
        }
    }, [loadVoices, synth]);

    const handlePause = () => {
        if (synth && synth.speaking && !synth.paused) {
            synth.pause();
            setIsPaused(true);
            setIsSpeaking(false);
            
            // If the user pauses during a generation attempt, we cancel the generation attempt
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
        utterance.volume = volume; // Apply volume setting

        utterance.onstart = () => {
            setIsSpeaking(true);
            setCurrentCharIndex(0);
        };
        
        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                // event.charIndex is relative to the cleaned utteranceText
                setCurrentCharIndex(event.charIndex);
            }
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setCurrentCharIndex(-1); // Reset index
            
            if (isRecordingAttempt) {
                // We handle the limitation failure in handleGenerateAudio now.
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
            setIsPaused(false); // Reset pause state
            setIsGeneratingAudio(false); // Stop recording attempt if active
        }
    };
    
    const handleGenerateAudio = () => {
        const textToUse = selectedText || text;
        if (!textToUse) {
            setError("Please enter text before attempting to generate audio.");
            return;
        }
        
        setIsGeneratingAudio(true);
        
        // Set an explanatory error immediately as we know native TTS cannot be recorded.
        setError("Audio file generation requires replacing the native SpeechSynthesis API with a library that uses the Web Audio API (e.g., a pure JS TTS engine or a serverless cloud API integration) to access raw audio data for file encoding. Functionality not yet implemented.");
        
        // Reset the UI state after a short delay so the user sees the notification
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
            
            // Reset React states to defaults
            setText(DEFAULT_TEXT);
            setSelectedVoice(null);
            setRate(1.0);
            setPitch(1.0);
            setVolume(1.0);
            setIsControlsOpen(true);
            setError(null);
            
            // Force re-load voices to ensure selectedVoice logic re-runs if needed
            loadVoices(); 
            alert("All local settings and data cleared.");
        }
    };

    // --- File Handling (Same as before) ---
    const handleFileChange = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setText(e.target.result);
        reader.onerror = () => setError("Error reading file.");
        reader.readAsText(file);
    };

    // --- Memoized Indexing for Highlighting ---
    const textToHighlight = selectedText || text;
    
    // Helper to extract plain color class name from a bg class (e.g., 'bg-cyan-600' -> 'cyan-600')
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
                // Advance index by cleaned word length + 1 space separator (standard TTS behavior)
                currentCleanIndex += cleanedToken.length + 1; 
            }
        }
        return visualTokens;
    }, [textToHighlight]);


    return (
        // Apply dynamic background and text color based on theme
        <div className={`flex h-screen ${currentTheme.bg} ${currentTheme.text} overflow-hidden relative`}>
            
            {/* Sidebar Controls */}
            
            {/* 1. Desktop Sidebar (Relative, Width controlled by the wrapper) */}
            <div 
                className={`hidden md:flex flex-shrink-0 h-full z-10 relative 
                           transition-all duration-300 ease-in-out 
                           ${currentTheme.bg} border-r border-slate-700 
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
                        theme={currentTheme} // Pass theme for component styling
                    />
                </div>
                
                {/* Desktop Toggle Button */}
                <button
                    onClick={() => setIsControlsOpen(prev => !prev)}
                    // Position adjusted to be relative to the sidebar itself
                    className={`absolute top-4 ${isControlsOpen ? '-right-4' : 'right-0'} 
                                p-2 ${currentTheme.accentBg} hover:opacity-90 text-white rounded-full shadow-lg transition-all duration-300 z-30 hidden md:block`}
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
                           ${currentTheme.bg} shadow-2xl md:hidden`}
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
                />
                {/* Mobile Close Button (inside the sidebar) */}
                <button
                    onClick={() => setIsControlsOpen(false)}
                    className={`absolute top-4 right-4 p-2 ${currentTheme.accentBg} hover:opacity-90 text-white rounded-full shadow-lg transition-all duration-300 z-40`}
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
                    className={`fixed top-4 left-4 p-2 ${currentTheme.accentBg} hover:opacity-90 text-white rounded-full shadow-lg transition-all duration-300 z-40 md:hidden`}
                    aria-label="Expand Controls"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
            )}

            {/* Main Dictation Area */}
            <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto relative">
                <header className="mb-4 md:mb-6">
                    <h1 className={`text-4xl md:text-5xl font-extrabold ${currentTheme.headerAccent}`}>The Great Dictator</h1>
                    <p className="text-sm md:text-md text-slate-400 mt-1">Commanding clarity, one word at a time.</p>
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
                        ref={textDisplayRef} // Apply ref here
                        className="flex-1 w-full p-4 text-lg bg-slate-800 rounded-lg border-2 border-slate-700 overflow-y-auto font-mono text-left select-none"
                        style={{ whiteSpace: 'pre-wrap' }}
                    >
                        {tokenData.map((item, mapIndex) => {
                            let highlightClass = '';
                            let isCurrentWord = false;
                            
                            if (item.isWord && currentCharIndex > -1) {
                                const start = item.cleanIndexStart;
                                const end = item.cleanIndexStart + item.cleanLength;
                                
                                // Check if currentCharIndex falls within the boundary of the current word
                                if (currentCharIndex >= start && currentCharIndex < end) {
                                    isCurrentWord = true;
                                    // Use dynamic accent color for highlighting. Added underline/emphasis for beauty.
                                    highlightClass = `text-white rounded px-0.5 font-semibold underline decoration-wavy decoration-${accentClass} decoration-2 bg-${accentClass}/30`;
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
                        className={`flex-1 w-full p-4 text-lg bg-slate-800 rounded-lg border-2 border-slate-700 focus:border-${currentTheme.accentBg.replace('bg-', '')} transition duration-200 resize-none font-mono text-left`}
                        placeholder="Enter the text to be dictated..."
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            setSelectedText(''); // Clear selection on edit
                        }}
                        onMouseUp={(e) => {
                            // Logic to detect selected text
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
                    <p className='mt-2 text-sm text-slate-400'>
                        Selected text ready for dictation: <span className='font-semibold text-dictator-light italic'>
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
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/50' // Resume color
                                    : `${currentTheme.accentBg} hover:opacity-90 text-white shadow-lg shadow-rose-600/50`}`
                        }
                    >
                        {isSpeaking ? 'PAUSE' : (isPaused ? 'RESUME DICTATION' : 'START DICTATION')}
                    </button>

                    {/* Stop Button (appears when speaking or paused or generating audio) */}
                    {(isSpeaking || isPaused || isGeneratingAudio) && (
                        <button
                            onClick={handleStop}
                            className="py-3 px-6 text-lg font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/50"
                        >
                            STOP
                        </button>
                    )}
                    
                    <button
                        onClick={() => setText('')}
                        disabled={isSpeaking || isPaused || isGeneratingAudio}
                        className="py-3 px-6 text-lg font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-dictator-light disabled:opacity-50"
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
                                : 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/50 disabled:opacity-50'}`
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