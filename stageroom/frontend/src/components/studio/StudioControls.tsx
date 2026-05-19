import { useState } from 'react';
import { useStreamStore } from '../../hooks/useStreamStore';

export const StudioControls: React.FC = () => {
  const { isStreaming, isRecording, setStreaming, setRecording } = useStreamStore();
  const [isStartingStream, setIsStartingStream] = useState(false);
  const [isStoppingStream, setIsStoppingStream] = useState(false);
  const [isStartingRecord, setIsStartingRecord] = useState(false);
  const [isStoppingRecord, setIsStoppingRecord] = useState(false);

  const handleStartStreamClick = async () => {
    setIsStartingStream(true);
    try {
      setStreaming(true);
    } catch (error) {
      console.error('Failed to start stream:', error);
    } finally {
      setIsStartingStream(false);
    }
  };

  const handleStopStreamClick = async () => {
    setIsStoppingStream(true);
    try {
      setStreaming(false);
    } catch (error) {
      console.error('Failed to stop stream:', error);
    } finally {
      setIsStoppingStream(false);
    }
  };

  const handleStartRecordClick = async () => {
    setIsStartingRecord(true);
    try {
      setRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    } finally {
      setIsStartingRecord(false);
    }
  };

  const handleStopRecordClick = async () => {
    setIsStoppingRecord(true);
    try {
      setRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    } finally {
      setIsStoppingRecord(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Stream Controls</h2>

      <div className="mb-4">
        <button
          onClick={handleStartStreamClick}
          disabled={isStreaming || isStartingStream}
          className="w-full mb-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition disabled:opacity-50"
        >
          {isStartingStream ? 'Starting...' : isStreaming ? 'Streaming' : 'Start Stream'}
        </button>
        <button
          onClick={handleStopStreamClick}
          disabled={!isStreaming || isStoppingStream}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition disabled:opacity-50"
        >
          {isStoppingStream ? 'Stopping...' : isStreaming ? 'Stop Stream' : 'Stop Stream'}
        </button>
      </div>

      <div className="mb-4">
        <button
          onClick={handleStartRecordClick}
          disabled={isRecording || isStartingRecord}
          className="w-full mb-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
        >
          {isStartingRecord ? 'Starting...' : isRecording ? 'Recording' : 'Start Recording'}
        </button>
        <button
          onClick={handleStopRecordClick}
          disabled={!isRecording || isStoppingRecord}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition disabled:opacity-50"
        >
          {isStoppingRecord ? 'Stopping...' : isRecording ? 'Stop Recording' : 'Stop Recording'}
        </button>
      </div>

      <div className="text-xs text-gray-400 space-y-1">
        <div>Status: {isStreaming ? 'Live' : 'Offline'}</div>
        <div>Recording: {isRecording ? 'Active' : 'Inactive'}</div>
      </div>
    </div>
  );
};
