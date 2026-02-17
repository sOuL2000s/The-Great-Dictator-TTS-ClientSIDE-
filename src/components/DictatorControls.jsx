import React from 'react';

const DictatorControls = ({
    voices,
    selectedVoice,
    onVoiceChange,
    rate,
    onRateChange,
    pitch,
    onPitchChange,
    onFileChange,
}) => {

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onFileChange(file);
        }
    };

    return (
        <div className="p-6 bg-dictator-dark text-dictator-light h-full overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-dictator-accent border-b border-dictator-accent pb-2">
                Dictator Controls
            </h2>

            {/* Voice Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Voice Selector ({voices.length} available)</label>
                <select
                    className="w-full p-2 bg-slate-700 text-dictator-light rounded-lg border border-slate-600 focus:ring-dictator-accent focus:border-dictator-accent"
                    value={selectedVoice}
                    onChange={(e) => onVoiceChange(e.target.value)}
                >
                    {voices.map((voice, index) => (
                        <option key={index} value={voice.name}>
                            {voice.name} ({voice.lang}) {voice.default ? ' (Default)' : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Dictation Speed (Rate) */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Dictation Speed: {rate.toFixed(1)}x
                </label>
                <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={rate}
                    onChange={(e) => onRateChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg accent-dictator-accent"
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
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg accent-dictator-accent"
                />
            </div>

            {/* File Upload */}
            <div className="mt-8 pt-4 border-t border-slate-700">
                <label className="block text-lg font-bold mb-3 text-dictator-accent">
                    Upload Your Script (TXT, MD, HTML)
                </label>
                <input
                    type="file"
                    accept=".txt,.md,.html"
                    onChange={handleFileChange}
                    className="w-full text-sm text-dictator-light
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-dictator-accent file:text-white
                        hover:file:bg-rose-700
                    "
                />
                <p className='text-xs mt-2 text-slate-400'>
                    Note: Complex formats like PDF require server-side parsing and cannot be fully supported client-side.
                </p>
            </div>
        </div>
    );
};

export default DictatorControls;