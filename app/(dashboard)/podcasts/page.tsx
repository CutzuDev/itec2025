"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import {
  Loader2,
  Play,
  Save,
  Volume2,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type Curriculum = {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  created_at: string;
  audio_url: string | null;
};

type LanguageOption = {
  value: string;
  label: string;
};

export default function PodcastsPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const supabase = createClient();

  const languageOptions: LanguageOption[] = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "ru", label: "Russian" },
    { value: "zh", label: "Chinese" },
    { value: "ja", label: "Japanese" },
    { value: "ko", label: "Korean" },
  ];

  useEffect(() => {
    fetchCurricula();
  }, []);

  const fetchCurricula = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to view your curricula");
      }

      // Fetch curricula created by the current user
      const { data, error: fetchError } = await supabase
        .from("curricula")
        .select("id, title, content, summary, created_at, audio_url")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw new Error(`Failed to fetch curricula: ${fetchError.message}`);
      }

      setCurricula(data || []);
    } catch (err) {
      setError(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setCurricula([]);
    } finally {
      setLoading(false);
    }
  };

  const convertToSpeech = async (curriculum: Curriculum) => {
    try {
      setProcessingId(curriculum.id);
      setError(null);
      setSuccessMessage(null);

      // Extract text from the HTML summary or use the title if summary is not available
      let textToConvert = curriculum.title;

      if (curriculum.summary) {
        // Create a temporary div to parse HTML and extract text
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = curriculum.summary;
        textToConvert =
          tempDiv.textContent || tempDiv.innerText || curriculum.title;
      }

      // Limit text to avoid long processing times (adjust as needed)
      const maxChars = 3000;
      if (textToConvert.length > maxChars) {
        textToConvert = textToConvert.substring(0, maxChars) + "...";
      }

      // Make request to TTS API
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: textToConvert,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Get audio blob from response
      const audioBlob = await response.blob();

      // Create object URL for the audio blob for client-side playback
      const audioObjectUrl = URL.createObjectURL(audioBlob);

      // Save the audio data to the curriculum record
      await saveAudioToCurriculum(curriculum.id, audioBlob);

      // Update local state for immediate playback
      setCurricula(
        curricula.map((c) =>
          c.id === curriculum.id ? { ...c, audio_url: audioObjectUrl } : c
        )
      );

      setSuccessMessage(
        `Successfully converted "${curriculum.title}" to speech`
      );
    } catch (err) {
      setError(
        `Failed to convert text to speech: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const saveAudioToCurriculum = async (
    curriculumId: string,
    audioBlob: Blob
  ) => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to save audio");
      }

      // Convert Blob to base64 string
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64String = arrayBufferToBase64(arrayBuffer);

      // Update the curriculum record with the audio data directly
      const { error: updateError } = await supabase
        .from("curricula")
        .update({
          audio_url: base64String,
          updated_at: new Date().toISOString(),
        })
        .eq("id", curriculumId);

      if (updateError) {
        throw new Error(`Failed to update curriculum: ${updateError.message}`);
      }
    } catch (err) {
      throw new Error(
        `Failed to save audio: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  // Helper function to convert ArrayBuffer to base64 string
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
  };

  // Format time in MM:SS format
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Setup the player with the given audio URL
  const setupPlayer = (curriculum: Curriculum): HTMLAudioElement | null => {
    if (!curriculum.audio_url) return null;

    // Stop any currently playing audio and clear interval
    if (playerRef.current) {
      playerRef.current.pause();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    // If trying to stop the currently playing audio
    if (playingId === curriculum.id) {
      setPlayingId(null);
      setAudioPlayer(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return null;
    }

    // Create new audio player
    const player = new Audio(curriculum.audio_url);
    playerRef.current = player;

    // Set up event listeners
    player.addEventListener("loadedmetadata", () => {
      setDuration(player.duration);
    });

    player.addEventListener("ended", () => {
      setPlayingId(null);
      setIsPlaying(false);
      setCurrentTime(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    });

    player.addEventListener("error", (err) => {
      setError(`Failed to play audio: ${err.message || "Unknown error"}`);
      setPlayingId(null);
      setIsPlaying(false);
    });

    // Set volume
    player.volume = volume;

    // Start playing
    setAudioPlayer(player);
    setPlayingId(curriculum.id);

    return player;
  };

  // Play or pause the current audio
  const togglePlay = (curriculum: Curriculum) => {
    let player = playerRef.current;

    // If no player set up yet or different curriculum, set up a new one
    if (!player || playingId !== curriculum.id) {
      player = setupPlayer(curriculum);
      if (!player) return;
    }

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
          setError(`Failed to play audio: ${err.message}`);
          setPlayingId(null);
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

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="w-full p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Text to Speech Converter</h1>

          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <Label htmlFor="language-select">Language:</Label>
            <Select
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
            >
              <SelectTrigger id="language-select" className="w-[180px]">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-2">Loading your curricula...</p>
          </div>
        ) : curricula.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              You haven't created any curricula yet.
            </p>
            <Button onClick={() => (window.location.href = "/summaries")}>
              Create New Curriculum
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {curricula.map((curriculum) => (
              <Card key={curriculum.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="truncate">
                        {curriculum.title}
                      </CardTitle>
                      <CardDescription>
                        Created on {formatDate(curriculum.created_at)}
                      </CardDescription>
                    </div>
                    <div>
                      {curriculum.audio_url && (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          Audio Available
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {curriculum.summary ? (
                    <div className="prose prose-sm max-w-none line-clamp-3 mb-4">
                      <div
                        dangerouslySetInnerHTML={{ __html: curriculum.summary }}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500 italic mb-4">
                      No summary available
                    </p>
                  )}

                  {curriculum.audio_url && playingId === curriculum.id && (
                    <div className="mt-4 border rounded-md p-3 bg-gray-50">
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
                            onClick={() => togglePlay(curriculum)}
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
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex space-x-2">
                    {curriculum.audio_url ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePlay(curriculum)}
                          className={
                            playingId === curriculum.id && isPlaying
                              ? "bg-primary text-primary-foreground"
                              : ""
                          }
                        >
                          {playingId === curriculum.id && isPlaying ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Play Audio
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => convertToSpeech(curriculum)}
                          disabled={processingId === curriculum.id}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate in {languageOptions.find(l => l.value === selectedLanguage)?.label || "English"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => convertToSpeech(curriculum)}
                        disabled={processingId === curriculum.id}
                      >
                        {processingId === curriculum.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Convert to Audio
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
