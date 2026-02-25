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
        <div className={`p-8 ${theme.sidebarBg} ${theme.text} h-full overflow-y-auto font-sans flex flex-col gap-10`}>
            <div>
                <h2 className={`text-xs font-bold uppercase tracking-widest mb-6 ${theme.infoText} opacity-70`}>
                    App Theme
                </h2>
                <div className={`flex justify-between items-center p-4 rounded-xl ${theme.inputBg} border ${theme.inputBorder} ${isDarkMode ? 'shadow-inner shadow-black/20' : 'shadow-sm'}`}>
                    <label className="text-sm font-semibold">
                        {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                    </label>
                    <button
                        onClick={onToggleDarkMode}
                        className={`flex items-center p-2.5 rounded-lg transition duration-200 
                                    ${theme.buttonSecondaryHover} ${theme.buttonSecondaryText}`}
                        aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDarkMode ? (
                            <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                        ) : (
                            <svg className="w-5 h-5 text-rose-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <h2 className={`text-xs font-bold uppercase tracking-widest ${theme.infoText} opacity-70`}>
                    Voice Settings
                </h2>
                
                {/* Voice Selection */}
                <div>
                    <label className={`block text-xs font-medium mb-3 ${theme.infoText} uppercase tracking-wider`}>
                        Narrator ({voices.length} voices)
                    </label>
                    <div className="relative group">
                        <select
                            className={`w-full p-3 pl-4 ${theme.inputBg} ${theme.text} rounded-xl border ${theme.inputBorder} focus:border-rose-600/30 focus:ring-4 focus:ring-rose-600/5 appearance-none cursor-pointer transition-all duration-200 shadow-sm`}
                            value={selectedVoice}
                            onChange={(e) => onVoiceChange(e.target.value)}
                        >
                            {voices.map((voice, index) => (
                                <option key={index} value={voice.name}>
                                    {voice.name} ({voice.lang})
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Dictation Speed (Rate) */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <label className={`text-xs font-medium ${theme.infoText} uppercase tracking-wider`}>
                            Speed
                        </label>
                        <span className="text-sm font-bold text-rose-500">{rate.toFixed(1)}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="4"
                        step="0.1"
                        value={rate}
                        onChange={(e) => onRateChange(parseFloat(e.target.value))}
                        className={`w-full h-1.5 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} rounded-lg appearance-none cursor-pointer accent-rose-600 transition-all duration-200`}
                    />
                </div>
                
                {/* Volume */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <label className={`text-xs font-medium ${theme.infoText} uppercase tracking-wider`}>
                            Volume
                        </label>
                        <span className="text-sm font-bold text-rose-500">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                        className={`w-full h-1.5 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} rounded-lg appearance-none cursor-pointer accent-rose-600 transition-all duration-200`}
                    />
                </div>

                {/* Pitch */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <label className={`text-xs font-medium ${theme.infoText} uppercase tracking-wider`}>
                            Pitch
                        </label>
                        <span className="text-sm font-bold text-rose-500">{pitch.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={pitch}
                        onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                        className={`w-full h-1.5 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} rounded-lg appearance-none cursor-pointer accent-rose-600 transition-all duration-200`}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <h2 className={`text-xs font-bold uppercase tracking-widest ${theme.infoText} opacity-70`}>
                    Source
                </h2>
                <div className="group">
                    <label className={`block text-xs font-medium mb-3 ${theme.infoText} uppercase tracking-wider`}>
                        Upload Script
                    </label>
                    <div className={`relative flex flex-col items-center justify-center border-2 border-dashed ${theme.inputBorder} rounded-xl p-6 transition-all duration-200 group-hover:border-rose-600/30 ${theme.inputBg}`}>
                        <svg className="w-8 h-8 text-slate-500 mb-3 group-hover:text-rose-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <span className="text-xs font-medium text-slate-400 text-center mb-1">Click to upload or drag & drop</span>
                        <span className="text-[10px] text-slate-600">TXT, MD, HTML</span>
                        <input
                            type="file"
                            accept=".txt,.md,.html"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </div>
                </div>
            </div>
            
            <div className="mt-auto pt-6 border-t border-slate-800/50 flex flex-col gap-4">
                <button
                    onClick={onClearData}
                    className="w-full py-3 px-4 text-xs font-bold uppercase tracking-wider rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all duration-300"
                >
                    Reset Environment
                </button>
                <p className={`text-[10px] leading-relaxed text-center italic ${theme.infoText}`}>
                    Clears all locally stored configurations and data.
                </p>
            </div>
        </div>
    );
};

export default DictatorControls;