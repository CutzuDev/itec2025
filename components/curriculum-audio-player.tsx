"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface CurriculumAudioPlayerProps {
  audioUrl: string;
}

// Format seconds to mm:ss
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const CurriculumAudioPlayer: React.FC<CurriculumAudioPlayerProps> = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create audio player when component mounts
    const player = new Audio(audioUrl);
    playerRef.current = player;

    // Set up event listeners
    player.addEventListener("loadedmetadata", () => {
      setDuration(player.duration);
    });

    player.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    });

    player.addEventListener("error", (err) => {
      console.error("Audio player error:", err);
      setIsPlaying(false);
    });

    // Set volume
    player.volume = volume;

    // Clean up when component unmounts
    return () => {
      if (player) {
        player.pause();
        player.src = "";
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [audioUrl]);

  // Play or pause the current audio
  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying) {
      // Pause
      player.pause();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Play
      player
        .play()
        .then(() => {
          setIsPlaying(true);
          // Start tracking progress
          progressIntervalRef.current = setInterval(() => {
            if (player) {
              setCurrentTime(player.currentTime);
            }
          }, 1000);
        })
        .catch((err) => {
          console.error(`Failed to play audio: ${err.message}`);
          setIsPlaying(false);
        });
    }
  };

  // Stop playing
  const stopAudio = () => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  // Skip forward 10 seconds
  const skipForward = () => {
    if (playerRef.current) {
      playerRef.current.currentTime = Math.min(
        playerRef.current.duration,
        playerRef.current.currentTime + 10
      );
      setCurrentTime(playerRef.current.currentTime);
    }
  };

  // Skip backward 10 seconds
  const skipBackward = () => {
    if (playerRef.current) {
      playerRef.current.currentTime = Math.max(
        0,
        playerRef.current.currentTime - 10
      );
      setCurrentTime(playerRef.current.currentTime);
    }
  };

  // Seek to a specific time in the audio
  const seekTo = (value: number[]) => {
    if (playerRef.current && value.length > 0) {
      playerRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  // Set volume
  const adjustVolume = (value: number[]) => {
    if (playerRef.current && value.length > 0) {
      const newVolume = value[0];
      playerRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  return (
    <div className="border rounded-md p-3 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">
          {formatTime(currentTime)}
        </span>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={skipBackward}
            className="h-7 w-7"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={togglePlay}
            className="h-8 w-8"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={skipForward}
            className="h-7 w-7"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={stopAudio}
            className="h-7 w-7"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm text-gray-500">
          {formatTime(duration)}
        </span>
      </div>

      <div className="mb-4">
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={0.1}
          onValueChange={seekTo}
          className="w-full"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Volume2 className="h-4 w-4 text-gray-500" />
        <Slider
          value={[volume]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={adjustVolume}
          className="w-24"
        />
      </div>
    </div>
  );
};

export default CurriculumAudioPlayer; 