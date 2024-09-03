import React, { useState, useCallback } from 'react';
import { IconPlus, IconClose } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Place {
    cid: React.Key | null | undefined;
    latitude: number;
    longitude: number;
    title: string;
    address: string;
    rating: number;
    category: string;
    phoneNumber?: string;
    website?: string;
}

interface BookingPopupProps {
    showBookingPopup: boolean;
    selectedPlace: Place | null;
    currentLocation: string;
    isLoading: boolean;
    fare: number | null;
    onClose: () => void;
    onLocationChange: (location: string) => void;
    onNext: () => void;
    onBook: () => void;
}

const BookingPopup: React.FC<BookingPopupProps> = ({
    showBookingPopup,
    selectedPlace,
    currentLocation,
    isLoading,
    fare,
    onClose,
    onLocationChange,
    onNext,
    onBook
}) => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${showBookingPopup ? '' : 'hidden'}`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Book a Cab</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <IconClose className="w-5 h-5" />
                </button>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Location</label>
                    <Input
                        type="text"
                        value={currentLocation}
                        onChange={(e) => onLocationChange(e.target.value)}
                        placeholder="Enter your current location"
                        className="w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination</label>
                    <Input
                        type="text"
                        value={selectedPlace?.address || ''}
                        readOnly
                        className="w-full"
                    />
                </div>
                {fare === null ? (
                    <Button onClick={onNext} disabled={!currentLocation || isLoading} className="w-full">
                        {isLoading ? 'Loading...' : 'Next'}
                    </Button>
                ) : (
                    <div>
                        <p className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Estimated Fare: {fare} USD</p>
                        <Button onClick={onBook} className="w-full">Book</Button>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const LocationSidebar = ({ places }: { places: Place[] }) => {
    const [showMore, setShowMore] = useState(false);
    const [showBookingPopup, setShowBookingPopup] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [currentLocation, setCurrentLocation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fare, setFare] = useState<number | null>(null);
    
    // only show the first 4 places
    places = places.slice(0, 4);

    const generateRandomFare = () => {
        return Math.floor(Math.random() * (120 - 50 + 1) + 10);
    };

    const handleBookCab = useCallback((place: Place) => {
        setSelectedPlace(place);
        setShowBookingPopup(true);
    }, []);

    const handleNext = useCallback(() => {
        if (currentLocation) {
            setIsLoading(true);
            setTimeout(() => {
                setFare(generateRandomFare());
                setIsLoading(false);
            }, 5000);
        }
    }, [currentLocation]);

    const handleBook = useCallback(() => {
        alert(`Booking confirmed!\nFrom: ${currentLocation}\nTo: ${selectedPlace?.address}\nFare: ${fare} USD`);
        setShowBookingPopup(false);
        setCurrentLocation('');
        setFare(null);
    }, [currentLocation, selectedPlace, fare]);

    const handleLocationChange = useCallback((location: string) => {
        setCurrentLocation(location);
    }, []);

    const handleClosePopup = useCallback(() => {
        setShowBookingPopup(false);
        setCurrentLocation('');
        setFare(null);
    }, []);

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 sm:p-4 mt-4">
            <div className="flex items-center mb-3">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold flex-grow text-black dark:text-white">Location Details</h2>
                {places.length > 3 && (
                    <div className="flex justify-center ml-2">
                        <button
                            className="text-black dark:text-white focus:outline-none"
                            onClick={() => setShowMore(!showMore)}>
                            {showMore ? <IconClose className="w-4 h-4 sm:w-5 sm:h-5" /> : <IconPlus className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>
                    </div>
                )}
            </div>
            <div className={`space-y-3 sm:space-y-4 transition-all duration-500 ${showMore ? 'max-h-[5000px]' : 'max-h-[450px] sm:max-h-[600px]'} overflow-hidden`}>
                {places?.slice(0, showMore ? places.length : 3).map((place: Place) => (
                    <div key={place.cid} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
                        <h3 className="text-base sm:text-lg font-semibold mb-2">{place.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-2">{place.address}</p>
                        <div className="flex items-center mb-2">
                            <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mr-1">Rating:</span>
                            <div className="flex items-center">
                                {[...Array(5)].map((_, index) => (
                                    <svg
                                        key={index}
                                        className={`w-3 h-3 sm:w-4 sm:h-4 ${index < Math.floor(place.rating)
                                                ? 'text-yellow-400'
                                                : 'text-gray-300 dark:text-gray-500'
                                            }`}
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 15.585l-5.293 2.776.1-5.867L.416 8.222l5.875-.855L10 2.415l3.709 4.952 5.875.855-4.391 4.272.1 5.867L10 15.585z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                ))}
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-2">Category: {place.category}</p>
                        {place.phoneNumber && (
                            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-2">
                                Phone: <a href={`tel:${place.phoneNumber}`} className="text-blue-500 hover:underline">{place.phoneNumber}</a>
                            </p>
                        )}
                        {place.website && (
                            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm truncate mb-2">
                                Website: <a href={place.website} className="text-blue-500 hover:underline">{place.website}</a>
                            </p>
                        )}
                        <Button 
                            onClick={() => handleBookCab(place)}
                            className="w-full mt-2 text-xs sm:text-sm"
                        >
                            Book Cab
                        </Button>
                    </div>
                ))}
            </div>
            <BookingPopup 
                showBookingPopup={showBookingPopup}
                selectedPlace={selectedPlace}
                currentLocation={currentLocation}
                isLoading={isLoading}
                fare={fare}
                onClose={handleClosePopup}
                onLocationChange={handleLocationChange}
                onNext={handleNext}
                onBook={handleBook}
            />
        </div>
    );
};

export default LocationSidebar;