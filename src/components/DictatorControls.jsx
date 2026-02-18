import React from 'react';

const DictatorControls = ({
    voices,
    selectedVoice,
    onVoiceChange,
    rate,
    onRateChange,
    pitch,
    onPitchChange,
    volume,
    onVolumeChange,
    onFileChange,
    onClearData,
    theme,
    isDarkMode, // New: Dark mode state
    onToggleDarkMode, // New: Function to toggle dark mode
}) => {

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onFileChange(file);
        }
    };

    const accentClass = theme.accentBg.replace('bg-', '');

    return (
        <div className={`p-6 ${theme.sidebarBg} ${theme.text} h-full overflow-y-auto`}>
            <h2 className={`text-3xl font-bold mb-6 ${theme.headerAccent} border-b ${theme.headerBorder} pb-2`}>
                Dictator Controls
            </h2>

            {/* Dark/Light Mode Toggle */}
            <div className="mb-6 flex justify-between items-center">
                <label className="text-sm font-medium">
                    Theme: {isDarkMode ? 'Dark' : 'Light'}
                </label>
                <button
                    onClick={onToggleDarkMode}
                    className={`flex items-center p-2 rounded-full transition duration-300 ease-in-out 
                                ${theme.buttonSecondaryBg} ${theme.buttonSecondaryHover} ${theme.buttonSecondaryText}`}
                    aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDarkMode ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg> // Moon icon
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.459 4.363A9.962 9.962 0 0110 18c-3.739 0-6.768-2.656-7.465-6.248-.047-.37.02-.746.155-1.111L2.247 9.87c.306-.985.46-2.028.46-3.111C2.707 5.772 3 5 3 5l.001-.001C3.411 3.568 4.227 2.625 5.25 2c.582-.365 1.155-.724 1.713-1.077l.192-.119A1 1 0 018 1.054V2a1 1 0 01-1 1H5.973A8.003 8.003 0 001.036 10c0 4.485 3.597 8.163 8.04 8.971C10 19 10 19 10 19c.143 0 .285-.003.427-.009.68-.028 1.348-.133 1.996-.32A1 1 0 0113 18v-.001l-.001-.001a1 1 0 01-.192-.119c-.58-.358-1.15-.723-1.71-.977l-.159-.074a1 1 0 01-.274-.187L11.5 15.637zM15 10a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z" clipRule="evenodd"></path></svg> // Sun icon
                    )}
                </button>
            </div>

            {/* Voice Selection */}
            <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${theme.infoText}`}>
                    Voice Selector ({voices.length} available)
                </label>
                <select
                    className={`w-full p-2 ${theme.inputBg} ${theme.text} rounded-lg border ${theme.inputBorder} focus:ring-${accentClass} focus:border-${accentClass} appearance-none cursor-pointer`}
                    value={selectedVoice}
                    onChange={(e) => onVoiceChange(e.target.value)}
                >
                    {voices.map((voice, index) => (
                        <option key={index} value={voice.name} className={`${theme.text}`}>
                            {voice.name} ({voice.lang}) {voice.default ? ' (Default)' : ''}
                        </option>
                    ))}
                </select>
                <p className={`text-xs mt-1 ${theme.infoText}`}>
                    Voice count depends entirely on your operating system and browser settings. 
                    <br/>
                    <span className="text-yellow-400">PRO TIP:</span> To unlock more high-quality voices, install additional language packs or Text-to-Speech voices via your OS settings (e.g., Windows "Speech settings," macOS "Accessibility settings").
                </p>
            </div>

            {/* Dictation Speed (Rate) */}
            <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${theme.infoText}`}>
                    Dictation Speed: {rate.toFixed(1)}x
                </label>
                <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.1"
                    value={rate}
                    onChange={(e) => onRateChange(parseFloat(e.target.value))}
                    className={`w-full h-2 ${theme.inputBorder.replace('border-', 'bg-')} rounded-lg appearance-none cursor-pointer accent-${accentClass}`}
                />
            </div>
            
            {/* Volume */}
            <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${theme.infoText}`}>
                    Volume: {volume.toFixed(1)}
                </label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className={`w-full h-2 ${theme.inputBorder.replace('border-', 'bg-')} rounded-lg appearance-none cursor-pointer accent-${accentClass}`}
                />
            </div>

            {/* Pitch */}
            <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${theme.infoText}`}>
                    Pitch: {pitch.toFixed(1)}
                </label>
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={pitch}
                    onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                    className={`w-full h-2 ${theme.inputBorder.replace('border-', 'bg-')} rounded-lg appearance-none cursor-pointer accent-${accentClass}`}
                />
            </div>

            {/* File Upload */}
            <div className={`mt-8 pt-4 border-t ${theme.headerBorder}`}>
                <label className={`block text-lg font-bold mb-3 ${theme.headerAccent}`}>
                    Upload Your Script (TXT, MD, HTML)
                </label>
                <input
                    type="file"
                    accept=".txt,.md,.html"
                    onChange={handleFileChange}
                    className={`w-full text-sm ${theme.text} p-3 rounded-lg border ${theme.inputBorder} ${theme.logoBg}
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:${theme.buttonSecondaryBg} file:${theme.highlightText}
                        file:text-sm file:font-semibold
                        file:${theme.accentBg}
                        hover:file:opacity-90
                    `}
                />
                <p className={`text-xs mt-2 ${theme.infoText}`}>
                    Note: Complex formats like PDF require server-side parsing and cannot be fully supported client-side.
                </p>
            </div>
            
            {/* Data Management */}
            <div className={`mt-8 pt-4 border-t ${theme.headerBorder}`}>
                <button
                    onClick={onClearData}
                    className="w-full py-2 px-4 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-800 text-white transition duration-200"
                >
                    Clear All Saved Data & Settings
                </button>
                <p className={`text-xs mt-2 ${theme.infoText}`}>
                    Resets all settings and input text stored locally in your browser.
                </p>
            </div>
        </div>
    );
};

export default DictatorControls;