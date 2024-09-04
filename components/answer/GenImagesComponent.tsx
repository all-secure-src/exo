import React, { useState, useEffect } from 'react';
import { Circle } from 'lucide-react';

interface Image {
    image: string;
    alt?: string;
    prompt: string;
}

interface ImagesComponentProps {
    omega_art: Image[];
}

const RetryImageComponent: React.FC<{ image: Image }> = ({ image }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const checkImage = () => {
            const img = new Image();
            img.onload = () => {
                setImageUrl(image.image);
                setLoading(false);
            };
            img.onerror = () => {
                if (retryCount < 10) {
                    setTimeout(() => {
                        setRetryCount(prevCount => prevCount + 1);
                    }, 3000);
                } else {
                    setLoading(false);
                }
            };
            img.src = image.image;
        };

        checkImage();
    }, [image.image, retryCount]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (loading) {
            timer = setInterval(() => {
                setProgress(prevProgress => {
                    if (prevProgress < 70) {
                        return prevProgress + (70 / 25);
                    } else if (prevProgress < 99) {
                        return prevProgress + (29 / 25);
                    } else {
                        return 99;
                    }
                });
            }, 350);
        }
        return () => clearInterval(timer);
    }, [loading]);

    if (loading) {
        return (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center">
                <div className="relative">
                    <Circle className="w-16 h-16 text-gray-600 dark:text-gray-400 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{Math.round(progress)}%</span>
                    </div>
                </div>
            </div>
        );
    }

    return imageUrl ? (
        <img
            src={imageUrl}
            alt={image.alt || image.prompt}
            className="max-h-[500px] object-contain w-full h-full"
        />
    ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-400">Failed to load image</p>
        </div>
    );
};

const GenImagesComponent: React.FC<ImagesComponentProps> = ({ omega_art }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const handleImageClick = (link: string) => {
        setSelectedImage(link);
    };

    const handleCloseModal = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            setSelectedImage(null);
        }
    };

    return (
        <>
            {omega_art.length <= 1 ? (
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mt-4">
                    <div className="items-center">
                        <h2 className="text-lg font-semibold flex-grow text-black dark:text-white">UltraSafe Imagine (Alpha v1.0)</h2>
                        <div className="flex flex-wrap">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="w-1/2 p-1">
                                    <div className="w-full overflow-hidden aspect-square">
                                        <RetryImageComponent image={{ image: '', prompt: 'Loading...' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mt-4">
                    <div className="flex items-center">
                        <h2 className="text-lg font-semibold flex-grow text-black dark:text-white">UltraSafe Imagine (Alpha v1.0)</h2>
                    </div>
                    <div className="flex flex-wrap mx-1 transition-all duration-500 overflow-hidden">
                        {omega_art.slice(0, omega_art.length > 2 ? 4 : 2).map((image, index) => (
                            <div
                                key={index}
                                className="transition ease-in-out hover:-translate-y-1 hover:scale-105 duration-200 w-1/2 p-1 cursor-pointer"
                                onClick={() => handleImageClick(image.image)}
                            >
                                <div className="overflow-hidden aspect-square">
                                    <RetryImageComponent image={image} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {selectedImage && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
                            onClick={handleCloseModal}
                        >
                            <div className="max-w-5xl max-h-full">
                                <img src={selectedImage} alt="Full size" className="max-w-full max-h-full" />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default GenImagesComponent;