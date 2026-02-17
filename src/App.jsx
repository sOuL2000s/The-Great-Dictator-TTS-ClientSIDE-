import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import DictatorControls from './components/DictatorControls';

// Utility function to clean text for dictation
const cleanText = (rawText) => {
    let clean = rawText.replace(/<[^>]*>/g, ' ');
    clean = clean.replace(/(\*|_|#|`)+/g, ' ');
    clean = clean.replace(/\s\s+/g, ' ').trim();
    return clean;
};

function App() {
    const [text, setText] = useState("Greetings, citizen. You have entered the domain of The Great Dictator. Click 'Start Dictation' to begin, or 'Record Audio' to capture the speech as a file.");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [rate, setRate] = useState(1.0);
    const [pitch, setPitch] = useState(1.0);
    const [error, setError] = useState(null);
    
    // New states for recording
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    
    // Refs for MediaRecorder
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    const synth = useMemo(() => window.speechSynthesis, []);

    // --- Voice Loading (Same as before) ---
    const loadVoices = useCallback(() => {
        const availableVoices = synth.getVoices();
        setVoices(availableVoices);
        if (availableVoices.length > 0 && !selectedVoice) {
            const defaultVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
            setSelectedVoice(defaultVoice ? defaultVoice.name : null);
        }
    }, [synth, selectedVoice]);

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

    // --- Core Dictation Logic (Modified for Recording) ---

    const handleSpeak = () => {
        if (!synth || !text) return;
        
        synth.cancel();

        const voiceObj = voices.find(v => v.name === selectedVoice);
        if (!voiceObj) return setError("Selected voice not found.");

        const utteranceText = cleanText(text);

        const utterance = new SpeechSynthesisUtterance(utteranceText);
        utterance.voice = voiceObj;
        utterance.rate = rate;
        utterance.pitch = pitch;

        utterance.onstart = () => {
            setIsSpeaking(true);
            if (isRecording) {
                // If recording is active, start MediaRecorder here (see handleRecord implementation)
            }
        };
        
        utterance.onend = () => {
            setIsSpeaking(false);
            if (isRecording) {
                // If recording is active, stop MediaRecorder here
                handleStopRecording();
            }
        };
        
        utterance.onerror = (event) => {
            setError(`Speech Error: ${event.error}`);
            setIsSpeaking(false);
        };

        synth.speak(utterance);
    };

    const handleStop = () => {
        if (synth) {
            synth.cancel();
            setIsSpeaking(false);
        }
        if (isRecording) {
            handleStopRecording();
        }
    };

    // --- Audio Recording Logic ---

    // NOTE: This function attempts to get a stream that includes system audio. 
    // This is NOT reliably supported by all browsers for security reasons (often requires user permission 
    // to record the SCREEN or MICROPHONE, even though we want speaker output).
    const startRecording = async () => {
        // 1. Reset
        setAudioBlob(null);
        recordedChunksRef.current = [];
        
        try {
            // Attempt to capture the audio output stream (system audio)
            // This is the least reliable part of the whole application.
            const stream = await navigator.mediaDevices.getDisplayMedia({
                audio: true, // Requires screen sharing permission
                video: false,
            });

            mediaRecorderRef.current = new MediaRecorder(stream, { 
                mimeType: 'audio/webm' 
            });

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const mimeType = mediaRecorderRef.current.mimeType;
                const blob = new Blob(recordedChunksRef.current, { type: mimeType });
                setAudioBlob(blob);
                setIsRecording(false);
                // Stop the captured stream tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            
            // Immediately start dictation after recorder is ready
            handleSpeak(); 

        } catch (err) {
            console.error("Recording failed. Browser may not support capturing system audio output.", err);
            setError("Recording failed. Check console for details. (Likely requires screen/mic permission or is unsupported)");
            setIsRecording(false);
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };
    
    const handleDownload = () => {
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `dictation_${Date.now()}.webm`; // WEBM is the standard output format
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
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

    return (
        <div className="flex h-screen bg-dictator-dark text-dictator-light">
            {/* Sidebar Controls */}
            <div className="w-1/4 min-w-[300px] border-r border-slate-700">
                <DictatorControls
                    voices={voices}
                    selectedVoice={selectedVoice}
                    onVoiceChange={setSelectedVoice}
                    rate={rate}
                    onRateChange={setRate}
                    pitch={pitch}
                    onPitchChange={setPitch}
                    onFileChange={handleFileChange}
                />
            </div>

            {/* Main Dictation Area */}
            <div className="flex-1 flex flex-col p-8">
                <header className="mb-6">
                    <h1 className="text-5xl font-extrabold text-dictator-accent">The Great Dictator</h1>
                    <p className="text-md text-slate-400 mt-1">Commanding clarity, one word at a time.</p>
                </header>

                {error && (
                    <div className="bg-red-900 p-3 rounded mb-4 border border-red-600">
                        ERROR: {error}
                    </div>
                )}

                {/* Text Input Area */}
                <textarea
                    className="flex-1 w-full p-4 text-lg bg-slate-800 rounded-lg border-2 border-slate-700 focus:border-dictator-accent transition duration-200 resize-none font-mono"
                    placeholder="Enter the text to be dictated..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />

                {/* Action Buttons */}
                <div className="mt-6 flex space-x-4 items-center">
                    
                    {/* Speak / Stop Button */}
                    <button
                        onClick={isSpeaking ? handleStop : handleSpeak}
                        disabled={!selectedVoice || !text || isRecording}
                        className={`py-3 px-8 text-xl font-bold rounded-lg transition duration-200 
                            ${isSpeaking 
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                                : 'bg-dictator-accent hover:bg-rose-700 text-white'}`
                        }
                    >
                        {isSpeaking ? 'STOP DICTATION' : 'START DICTATION'}
                    </button>
                    
                    {/* Record Button */}
                    <button
                        onClick={startRecording}
                        disabled={!selectedVoice || !text || isSpeaking || isRecording}
                        className={`py-3 px-6 text-lg font-semibold rounded-lg transition duration-200 
                            ${isRecording 
                                ? 'bg-orange-500 text-white animate-pulse' 
                                : 'bg-green-600 hover:bg-green-700 text-white'}`
                        }
                    >
                        {isRecording ? 'RECORDING...' : 'Record Audio'}
                    </button>

                    {/* Download Button */}
                    {audioBlob && (
                        <button
                            onClick={handleDownload}
                            className="py-3 px-6 text-lg font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Download WEBM
                        </button>
                    )}
                    
                    <button
                        onClick={() => setText('')}
                        className="py-3 px-6 text-lg font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-dictator-light"
                    >
                        Clear
                    </button>
                </div>
                
                {isRecording && (
                    <p className='mt-2 text-sm text-orange-400'>
                        Recording is active. Do not click 'Stop Dictation' unless the speech is finished.
                    </p>
                )}
            </div>
        </div>
    );
}

export default App;