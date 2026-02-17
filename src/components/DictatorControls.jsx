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
    theme, // Theme prop for dynamic styling
}) => {

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onFileChange(file);
        }
    };

    // Helper to extract plain color class name from a bg class (e.g., 'bg-cyan-600' -> 'cyan-600')
    const accentClass = theme.accentBg.replace('bg-', '');

    return (
        <div className={`p-6 ${theme.bg} ${theme.text} h-full overflow-y-auto`}>
            <h2 className={`text-3xl font-bold mb-6 ${theme.headerAccent} border-b border-slate-700 pb-2`}>
                Dictator Controls
            </h2>

            {/* Voice Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Voice Selector ({voices.length} available)
                </label>
                <select
                    className={`w-full p-2 bg-slate-700 ${theme.text} rounded-lg border border-slate-600 focus:ring-${accentClass} focus:border-${accentClass} appearance-none cursor-pointer`}
                    value={selectedVoice}
                    onChange={(e) => onVoiceChange(e.target.value)}
                >
                    {voices.map((voice, index) => (
                        <option key={index} value={voice.name} className="text-sm">
                            {voice.name} ({voice.lang}) {voice.default ? ' (Default)' : ''}
                        </option>
                    ))}
                </select>
                <p className='text-xs mt-1 text-slate-400'>
                    Voice count depends entirely on your operating system and browser settings. 
                    <br/>
                    <span className="text-yellow-400">PRO TIP:</span> To unlock more high-quality voices, install additional language packs or Text-to-Speech voices via your OS settings (e.g., Windows "Speech settings," macOS "Accessibility settings").
                </p>
            </div>

            {/* Dictation Speed (Rate) */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Dictation Speed: {rate.toFixed(1)}x
                </label>
                <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.1"
                    value={rate}
                    onChange={(e) => onRateChange(parseFloat(e.target.value))}
                    className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg accent-${accentClass}`}
                />
            </div>
            
            {/* Volume */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Volume: {volume.toFixed(1)}
                </label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg accent-${accentClass}`}
                />
            </div>

            {/* Pitch */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Pitch: {pitch.toFixed(1)}
                </label>
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={pitch}
                    onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                    className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg accent-${accentClass}`}
                />
            </div>

            {/* File Upload */}
            <div className="mt-8 pt-4 border-t border-slate-700">
                <label className={`block text-lg font-bold mb-3 ${theme.headerAccent}`}>
                    Upload Your Script (TXT, MD, HTML)
                </label>
                <input
                    type="file"
                    accept=".txt,.md,.html"
                    onChange={handleFileChange}
                    className={`w-full text-sm ${theme.text} p-3 rounded-lg border border-slate-600 bg-slate-800
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:bg-slate-600 file:text-white
                        file:text-sm file:font-semibold
                        file:${theme.accentBg}
                        hover:file:opacity-90
                    `}
                />
                <p className='text-xs mt-2 text-slate-400'>
                    Note: Complex formats like PDF require server-side parsing and cannot be fully supported client-side.
                </p>
            </div>
            
            {/* Data Management */}
            <div className="mt-8 pt-4 border-t border-slate-700">
                <button
                    onClick={onClearData}
                    className="w-full py-2 px-4 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-800 text-white transition duration-200"
                >
                    Clear All Saved Data & Settings
                </button>
                <p className='text-xs mt-2 text-slate-400'>
                    Resets all settings and input text stored locally in your browser.
                </p>
            </div>
        </div>
    );
};

export default DictatorControls;