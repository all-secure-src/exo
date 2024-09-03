import React, { useState, useEffect, useRef } from 'react';
import { IconPlus, IconClose } from '@/components/ui/icons';

// Custom SVG icons
const IconPlay = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
);

const IconPause = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
);

const IconVolume2 = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>
);

const IconVolumeX = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
    </svg>
);

const IconMaximize = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
    </svg>
);

const IconMinimize = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
    </svg>
);

interface Video {
    link: string;
    imageUrl: string;
    title: string;
}

interface VideosComponentProps {
    videos: Video[];
}

const VideosComponent: React.FC<VideosComponentProps> = ({ videos }) => {
    const [expanded, setExpanded] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [loadedImages, setLoadedImages] = useState<boolean[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<HTMLDivElement>(null);

    const itemsPerRow = {
        mobile: 3,
        tablet: 4,
        laptop: 6,
    };
    const defaultRows = {
        mobile: 2,
        tablet: 2,
        laptop: 1,
    };

    useEffect(() => {
        setLoadedImages(Array(videos.length).fill(false));
    }, [videos]);

    const handleImageLoad = (index: number) => {
        setLoadedImages((prevLoadedImages) => {
            const updatedLoadedImages = [...prevLoadedImages];
            updatedLoadedImages[index] = true;
            return updatedLoadedImages;
        });
    };

    const handleVideoClick = (video: Video) => {
        setSelectedVideo(video);
        setIsPlaying(true);
    };

    const handleCloseModal = () => {
        setSelectedVideo(null);
        setIsPlaying(false);
        setIsFullScreen(false);
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleFullScreen = () => {
        if (playerRef.current) {
            if (!document.fullscreenElement) {
                playerRef.current.requestFullscreen();
                setIsFullScreen(true);
            } else {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleProgress = () => {
        if (videoRef.current) {
            const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(progress);
        }
    };

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (videoRef.current) {
            const progressBar = e.currentTarget;
            const clickPosition = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
            videoRef.current.currentTime = clickPosition * videoRef.current.duration;
        }
    };

    const toggleExpand = () => {
        setExpanded(!expanded);
    };

    const getDefaultShownVideos = () => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth >= 1024) {
                return itemsPerRow.laptop * defaultRows.laptop;
            } else if (window.innerWidth >= 640) {
                return itemsPerRow.tablet * defaultRows.tablet;
            }
        }
        return itemsPerRow.mobile * defaultRows.mobile;
    };

    const [defaultShownVideos, setDefaultShownVideos] = useState(getDefaultShownVideos());

    useEffect(() => {
        const handleResize = () => {
            setDefaultShownVideos(getDefaultShownVideos());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const VideosSkeleton = () => (
        <div className="flex flex-wrap">
            {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="w-1/6 p-1">
                    <div className="w-full overflow-hidden aspect-video">
                        <div className="w-full h-24 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <>
            {
                videos.length === 0 || videos.length === 1 ? (
                    videos.length === 1 ? (
                        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mt-4">
                            <div className="items-center">
                                <h2 className="text-lg font-semibold flex-grow text-black dark:text-white">Videos</h2>
                                <VideosSkeleton />
                            </div>
                        </div>
                    ) : (
                        <></>
                    )
                ) : (
                    <>
                        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mt-4 w-full">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Videos</h2>
                                {videos.length > defaultShownVideos && (
                                    <button
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
                                        onClick={toggleExpand}
                                    >
                                        {expanded ? (
                                            <IconClose className="w-5 h-5" />
                                        ) : (
                                            <IconPlus className="w-5 h-5" />
                                        )}
                                    </button>
                                )}
                            </div>
                            <div className={`grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 ${expanded ? '' : 'max-h-[96px] lg:max-h-[88px]'} overflow-hidden transition-all duration-500`}>
                                {videos.slice(0, expanded ? videos.length : defaultShownVideos).map((video, index) => (
                                    <div
                                        key={index}
                                        className="cursor-pointer group"
                                        onClick={() => handleVideoClick(video)}
                                    >
                                        <div className="w-full aspect-video relative overflow-hidden rounded">
                                            {!loadedImages[index] && (
                                                <div className="w-full h-full bg-gray-300 dark:bg-gray-700 animate-pulse"></div>
                                            )}
                                            <img
                                                src={video.imageUrl}
                                                alt={`Video ${index + 1}`}
                                                className={`w-full h-full object-cover transition-all duration-200 transform group-hover:scale-105 ${loadedImages[index] ? 'block' : 'hidden'}`}
                                                onLoad={() => handleImageLoad(index)}
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200"></div>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                <IconPlay />
                                            </div>
                                        </div>
                                        <p className="mt-1 text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{video.title}</p>
                                    </div>
                                ))}
                            </div>
                            {selectedVideo && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
                                    <div ref={playerRef} className="relative w-full max-w-4xl aspect-video bg-black">
                                        <video
                                            ref={videoRef}
                                            src={selectedVideo.link}
                                            className="w-full h-full"
                                            onTimeUpdate={handleProgress}
                                            onEnded={() => setIsPlaying(false)}
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <button onClick={togglePlay} className="text-white hover:text-gray-300">
                                                    {isPlaying ? <IconPause /> : <IconPlay />}
                                                </button>
                                                <div className="flex items-center space-x-4">
                                                    <button onClick={toggleMute} className="text-white hover:text-gray-300">
                                                        {isMuted ? <IconVolumeX /> : <IconVolume2 />}
                                                    </button>
                                                    <button onClick={toggleFullScreen} className="text-white hover:text-gray-300">
                                                        {isFullScreen ? <IconMinimize /> : <IconMaximize />}
                                                    </button>
                                                    <button onClick={handleCloseModal} className="text-white hover:text-gray-300">
                                                        <IconClose className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-600 h-1 rounded-full overflow-hidden cursor-pointer" onClick={handleProgressBarClick}>
                                                <div className="bg-blue-500 h-full" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )
            }
        </>
    )
};

export default VideosComponent;