import React, { useState, useEffect, useRef } from 'react';
import { videoStorage } from '../../lib/videoStorage';
import { Play, Pause, Volume2, VolumeX, Maximize, Lock } from 'lucide-react';

interface VideoPlayerProps {
  contentId: string;
  title: string;
  isFreePreview: boolean;
  isLocked: boolean;
  hasAccess: boolean;
  onVideoEnd?: () => void;
}

export default function VideoPlayer({ contentId, title, isFreePreview, isLocked, hasAccess, onVideoEnd }: VideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewEnded, setPreviewEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const PREVIEW_DURATION = 5;

  useEffect(() => {
    loadVideo();
  }, [contentId]);

  const loadVideo = async () => {
    try {
      setLoading(true);
      setError('');
      const url = await videoStorage.getSignedUrl(contentId);
      setVideoUrl(url);
    } catch (err: any) {
      console.error('Failed to load video:', err);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    if (isFreePreview && !hasAccess && time >= PREVIEW_DURATION) {
      videoRef.current.pause();
      setIsPlaying(false);
      setPreviewEnded(true);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isFreePreview && !hasAccess && previewEnded) {
      return;
    }

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLocked && !hasAccess) {
    return (
      <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
        <div className="text-center text-white">
          <Lock className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">This video is locked</h3>
          <p className="text-gray-400">Contact your tutor to get access to this video</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-red-400">{error || 'Video not available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden relative group">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full aspect-video"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          if (onVideoEnd) onVideoEnd();
        }}
      />

      {previewEnded && isFreePreview && !hasAccess && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
          <div className="text-center text-white p-6">
            <Lock className="h-16 w-16 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Preview Ended</h3>
            <p className="text-gray-300 mb-4">
              Enroll in this course to watch the full video
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {isFreePreview && !hasAccess && (
          <div className="mb-2 text-yellow-400 text-sm font-medium">
            Free Preview: {PREVIEW_DURATION}s
          </div>
        )}

        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlay}
            className="text-white hover:text-blue-400 transition-colors"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>

          <button
            onClick={toggleMute}
            className="text-white hover:text-blue-400 transition-colors"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <div className="flex-1 flex items-center space-x-2">
            <span className="text-white text-sm">{formatTime(currentTime)}</span>
            <div className="flex-1 bg-gray-600 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <span className="text-white text-sm">{formatTime(duration)}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-blue-400 transition-colors"
          >
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
