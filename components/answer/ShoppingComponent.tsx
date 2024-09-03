import React, { useState } from 'react';
import { IconPlus, IconClose } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ShoppingItem {
    title: string;
    source: string;
    link: string;
    price: string;
    delivery: string;
    imageUrl: string;
    rating: number;
    ratingCount: number;
    offers: string;
    productId: string;
    position: number;
}

interface ShoppingComponentProps {
    shopping: ShoppingItem[];
}

const ShoppingComponent: React.FC<ShoppingComponentProps> = ({ shopping }) => {
    const [showModal, setShowModal] = useState(false);
    const [showBuyNowModal, setShowBuyNowModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);

    const ShoppingSkeleton = () => (
        <>
            {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="flex-grow">
                        <div className="w-2/3 h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                        <div className="w-1/2 h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                </div>
            ))}
        </>
    );

    const handleBuyNow = (item: ShoppingItem) => {
        setSelectedItem(item);
        setShowBuyNowModal(true);
    };

    const BuyNowModal = () => {
        const [formData, setFormData] = useState({
            cardNumber: '',
            cardName: '',
            expiryDate: '',
            cvv: '',
            address1: '',
            city: '',
            zipCode: '',
            phoneNumber: ''
        });

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setFormData(prevState => ({
                ...prevState,
                [name]: value
            }));
        };

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            // console.log('Form submitted:', formData);
            setShowBuyNowModal(false);
        };

        return (
            <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowBuyNowModal(false)}></div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-auto z-50 p-6 max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Complete Your Purchase</h2>
                        <Button 
                            onClick={() => setShowBuyNowModal(false)}
                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <IconClose className="w-6 h-6" />
                        </Button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="cardNumber">Card Number</Label>
                                <Input type="text" id="cardNumber" name="cardNumber" value={formData.cardNumber} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <Label htmlFor="cardName">Name on Card</Label>
                                <Input type="text" id="cardName" name="cardName" value={formData.cardName} onChange={handleInputChange} required />
                            </div>
                            <div className="flex space-x-4">
                                <div className="flex-1">
                                    <Label htmlFor="expiryDate">Expiry Date</Label>
                                    <Input type="text" id="expiryDate" name="expiryDate" placeholder="MM/YY" value={formData.expiryDate} onChange={handleInputChange} required />
                                </div>
                                <div className="flex-1">
                                    <Label htmlFor="cvv">CVV</Label>
                                    <Input type="text" id="cvv" name="cvv" value={formData.cvv} onChange={handleInputChange} required />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="address1">Address</Label>
                                <Input type="text" id="address1" name="address1" value={formData.address1} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <Label htmlFor="city">City</Label>
                                <Input type="text" id="city" name="city" value={formData.city} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <Label htmlFor="zipCode">ZIP Code</Label>
                                <Input type="text" id="zipCode" name="zipCode" value={formData.zipCode} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <Input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} required />
                            </div>
                        </div>
                        <Button type="submit" className="w-full mt-6">Complete Purchase</Button>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mt-4">
            <div className="flex items-center mb-4">
                <h2 className="text-lg font-semibold flex-grow text-gray-900 dark:text-gray-100">Recommended (Alpha v1.0)</h2>
            </div>
            <div className="space-y-4">
                {shopping.length === 0 ? (
                    <ShoppingSkeleton />
                ) : (
                    shopping.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex items-start space-x-4">
                            <div className="w-16 h-16 flex-shrink-0">
                                <a href={item.link} target="_blank" rel="noopener noreferrer">
                                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover rounded-md" />
                                </a>
                            </div>
                            <div className="flex-grow min-w-0">
                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm mb-1 hover:underline text-gray-900 dark:text-gray-100 line-clamp-2">
                                    {item.title}
                                </a>
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <span className="mr-1">{item.source}</span>
                                    <span className="text-yellow-500 mr-1">{'★'.repeat(Math.floor(item.rating))}</span>
                                    <span>({item.ratingCount})</span>
                                </div>
                                <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm mb-2">{item.price}</p>
                                <Button onClick={() => handleBuyNow(item)} className="w-full sm:w-auto text-sm py-1">Buy Now</Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="fixed inset-0 bg-black opacity-10 transition-opacity" onClick={() => setShowModal(false)}></div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto overflow-hidden relative">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recommended (Alpha v1.0)</h2>
                            <IconClose className="w-6 h-6 cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition duration-150 ease-in-out" onClick={() => setShowModal(false)} />
                        </div>
                        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[70vh]">
                            {shopping.map((item, index) => (
                                <div key={index} className="flex items-start space-x-4">
                                    <div className="w-16 h-16 flex-shrink-0">
                                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover rounded-md" />
                                        </a>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-base mb-1 hover:underline text-gray-900 dark:text-gray-100 line-clamp-2">
                                            {item.title}
                                        </a>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{item.source}</p>
                                        <div className="flex items-center mb-1">
                                            <span className="text-yellow-500 text-sm mr-1">{'★'.repeat(Math.floor(item.rating))}</span>
                                            <span className="text-gray-500 dark:text-gray-400 text-xs">{item.ratingCount}</span>
                                        </div>
                                        <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm mb-1">{item.price}</p>
                                        {item.delivery && <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">{item.delivery}</p>}
                                        <Button onClick={() => handleBuyNow(item)} className="w-full sm:w-auto text-sm py-1">Buy Now</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {showBuyNowModal && <BuyNowModal />}
        </div>
    );
};

export default ShoppingComponent;