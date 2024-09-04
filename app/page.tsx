'use client';

import React, { FormEvent, useEffect, useRef, useState, useCallback } from 'react';
import { useActions, readStreamableValue } from 'ai/rsc';
import { type AI } from './action';
import { ChatScrollAnchor } from '@/lib/hooks/chat-scroll-anchor';
import Textarea from 'react-textarea-autosize';
import { useEnterSubmit } from '@/lib/hooks/use-enter-submit';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { ArrowUp, Lock, ArrowLeft } from '@phosphor-icons/react';

// Import the LoginPopup component
import LoginPopup from '@/components/LoginPopup';

// Main components 
import SearchResultsComponent from '@/components/answer/SearchResultsComponent';
import UserMessageComponent from '@/components/answer/UserMessageComponent';
import FollowUpComponent from '@/components/answer/FollowUpComponent';
import InitialQueries from '@/components/answer/InitialQueries';

// Sidebar components
import LLMResponseComponent from '@/components/answer/LLMResponseComponent';
import ImagesComponent from '@/components/answer/ImagesComponent';
import GenImagesComponent from '@/components/answer/GenImagesComponent';
import VideosComponent from '@/components/answer/VideosComponent';

// Function calling components
const MapComponent = dynamic(() => import('@/components/answer/Map'), { ssr: false });
import MapDetails from '@/components/answer/MapDetails';
import ShoppingComponent from '@/components/answer/ShoppingComponent';
import FinancialChart from '@/components/answer/FinancialChart';

// Types
interface SearchResult {
  favicon: string;
  link: string;
  title: string;
}

interface Message {
  id: number;
  type: string;
  content: string;
  userMessage: string;
  images: Image[];
  videos: Video[];
  followUp: FollowUp | null;
  isStreaming: boolean;
  searchResults?: SearchResult[];
  conditionalFunctionCallUI?: any;
  places?: Place[];
  shopping?: Shopping[];
  ticker?: string | undefined;
  omega_art?: any;
}

interface StreamMessage {
  searchResults?: any;
  userMessage?: string;
  llmResponse?: string;
  llmResponseEnd?: boolean;
  images?: any;
  omega_art?: any;
  videos?: any;
  followUp?: any;
  conditionalFunctionCallUI?: any;
  places?: Place[];
  shopping?: Shopping[];
  ticker?: string;
}

interface Image {
  link: string;
}

interface Video {
  link: string;
  imageUrl: string;
}

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

interface FollowUp {
  choices: {
    message: {
      content: {
        followUp: string[];
      };
    };
  }[];
}

interface Shopping {
  type: string;
  title: string;
  source: string;
  link: string;
  price: string;
  shopping: any;
  position: number;
  delivery: string;
  imageUrl: string;
  rating: number;
  ratingCount: number;
  offers: string;
  productId: string;
}

export default function Page() {
  const { myAction } = useActions<typeof AI>();
  const { formRef, onKeyDown } = useEnterSubmit();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentLlmResponse, setCurrentLlmResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = () => {
    const loginTime = sessionStorage.getItem('loginTime');
    const isLoggedInSession = sessionStorage.getItem('isLoggedIn');

    if (isLoggedInSession === 'true' && loginTime) {
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - parseInt(loginTime);
      const threeHoursInMilliseconds = 3 * 60 * 60 * 1000;

      if (timeDifference < threeHoursInMilliseconds) {
        setIsLoggedIn(true);
      } else {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('loginTime');
        setIsLoggedIn(false);
        setShowLoginPopup(true);
      }
    } else {
      setShowLoginPopup(true);
    }
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setShowLoginPopup(false);
  };

  const handleFollowUpClick = useCallback(async (question: string) => {
    setCurrentLlmResponse('');
    await handleUserMessageSubmission(question);
  }, []);

  const handleBackClick = () => {
    setMessages([]);
    setCurrentLlmResponse('');
    setInputValue('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).nodeName)) {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [inputRef]);

  const exampleQueries = [
    "Should I invest in Nvidia in 2024? Create a detailed report",
    "A beautiful girl practicing yoga on a yoga mat",
    "Today my iPhone was broken, I am currently in Berlin. Where can I get a new iPhone?",
    "How can I make pizza at home?"
  ];

  const handleUserMessageSubmission = async (userMessage: string): Promise<void> => {
    const newMessageId = Date.now();
    const newMessage: Message = {
      id: newMessageId,
      type: 'userMessage',
      userMessage: userMessage,
      content: '',
      images: [],
      videos: [],
      followUp: null,
      isStreaming: true,
      searchResults: [],
      places: [],
      shopping: [],
      ticker: undefined,
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setIsStreaming(true);

    let lastAppendedResponse = "";
    try {
      const streamableValue = await myAction(userMessage, messages);
      let llmResponseString = "";
      for await (const message of readStreamableValue(streamableValue)) {
        const typedMessage = message as StreamMessage;
        setMessages((prevMessages) => {
          const messagesCopy = [...prevMessages];
          const messageIndex = messagesCopy.findIndex(msg => msg.id === newMessageId);
          if (messageIndex !== -1) {
            const currentMessage = messagesCopy[messageIndex];
            if (typedMessage.llmResponse && typedMessage.llmResponse !== lastAppendedResponse) {
              currentMessage.content += typedMessage.llmResponse;
              lastAppendedResponse = typedMessage.llmResponse;
            }
            if (typedMessage.llmResponseEnd) {
              currentMessage.isStreaming = false;
            }
            if (typedMessage.searchResults) {
              currentMessage.searchResults = typedMessage.searchResults;
            }
            if (typedMessage.images) {
              currentMessage.images = [...typedMessage.images];
            }
            if (typedMessage.omega_art) {
              currentMessage.omega_art = [...typedMessage.omega_art];
            }
            if (typedMessage.videos) {
              currentMessage.videos = [...typedMessage.videos];
            }
            if (typedMessage.followUp) {
              currentMessage.followUp = typedMessage.followUp;
            }
            if (typedMessage.conditionalFunctionCallUI) {
              const functionCalls = typedMessage.conditionalFunctionCallUI;
              for (const functionCall of functionCalls) {
                if (functionCall.type === 'places') {
                  currentMessage.places = functionCall.places;
                }
                if (functionCall.type === 'shopping') {
                  currentMessage.shopping = functionCall.shopping;
                }
                if (functionCall.type === 'ticker') {
                  currentMessage.ticker = functionCall.data;
                }
              }
            }
          }
          return messagesCopy;
        });
        if (typedMessage.llmResponse) {
          llmResponseString += typedMessage.llmResponse;
          setCurrentLlmResponse(llmResponseString);
        }
      }
    } catch (error) {
      console.error("Error streaming data for user message:", error);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = async (message: string) => {
    if (message) await handleUserMessageSubmission(message);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!isLoggedIn) {
      setShowLoginPopup(true);
      return;
    }
    const messageToSend = inputValue.trim();
    if (messageToSend) {
      setInputValue('');
      await handleSubmit(messageToSend);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 bg-white">
      {showLoginPopup && (
        <LoginPopup onLogin={handleLogin} onClose={() => setShowLoginPopup(false)} />
      )}

      {isLoggedIn && (
        <>
          {messages.length > 0 && (
            <div className="fixed bottom-[88px] left-1/2 transform -translate-x-1/2 z-10">
              <Button
                onClick={handleBackClick}
                className="bg-white text-black hover:bg-gray-100 flex items-center px-4 py-2 rounded-full shadow-md"
              >
                <ArrowLeft size={20} className="mr-2" />
                <span>Back</span>
              </Button>
            </div>
          )}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-center">Executable AI - Multimedia Experience Hub</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl">
                {exampleQueries.map((query, index) => (
                  <div
                    key={index}
                    className="p-4 bg-white rounded-lg shadow-md cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                    onClick={() => handleFollowUpClick(query)}
                  >
                    <p className="text-sm sm:text-base md:text-lg font-medium">{query}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="flex flex-col p-4 pb-24">
              {messages.map((message, index) => (
                <div key={`message-${index}`} className="flex flex-col w-full lg:w-3/4 mx-auto mb-4">
                  <div className="w-full text-right">
                    {message.type === 'userMessage' && <UserMessageComponent message={message.userMessage} />}
                  </div>
                  <div className="w-full">
                    {message.ticker && message.ticker.length > 0 && (
                      <FinancialChart key={`financialChart-${index}`} ticker={message.ticker} />
                    )}
                    {message.omega_art && <GenImagesComponent key={`omega_art-${index}`} omega_art={message.omega_art} />}
                    {message.shopping && message.shopping.length > 0 && <ShoppingComponent key={`shopping-${index}`} shopping={message.shopping} />}
                    {message.videos && <VideosComponent key={`videos-${index}`} videos={message.videos} />}
                    {message.images && <ImagesComponent key={`images-${index}`} images={message.images} />}
                    {message.places && message.places.length > 0 && (
                      <MapDetails key={`map-${index}`} places={message.places} />
                    )}
                    <LLMResponseComponent
                      llmResponse={message.content}
                      currentLlmResponse={currentLlmResponse}
                      index={index}
                      isStreaming={isStreaming}
                      key={`llm-response-${index}`}
                    />
                    {message.searchResults && (
                      <SearchResultsComponent key={`searchResults-${index}`} searchResults={message.searchResults} />
                    )}
                    {message.followUp && (
                      <div className="flex flex-col">
                        <FollowUpComponent key={`followUp-${index}`} followUp={message.followUp} handleFollowUpClick={handleFollowUpClick} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-2 fixed inset-x-0 bottom-0 w-full bg-gradient-to-b from-transparent to-gray-100 dark:to-gray-900 duration-300 ease-in-out animate-in bring-to-front">
            <div className="mx-auto max-w-xl sm:px-4">
              <form
                ref={formRef}
                onSubmit={handleFormSubmit}
                className="pb-4"
              >
                <div className="relative flex flex-col w-full overflow-hidden max-h-60 grow bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 shadow-lg">
                  <Textarea
                    ref={inputRef}
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    placeholder="Experience our Executable AI Capabilities."
                    className="w-full resize-none bg-transparent px-4 py-[1.3rem] focus-within:outline-none text-sm sm:text-base text-black dark:text-white pr-[45px]"
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    name="message"
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <ChatScrollAnchor trackVisibility={true} />
                </div>
              </form>
            </div>
          </div>
        </>
      )};
    </div>
  );
}