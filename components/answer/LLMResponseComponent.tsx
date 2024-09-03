import React from 'react';
import Markdown from 'react-markdown';

interface LLMResponseComponentProps {
  llmResponse: string;
  currentLlmResponse: string;
  index: number;
  isStreaming: boolean;
}

const ShimmerEffect = () => (
  <div className="animate-pulse flex space-x-4">
    <div className="flex-1 space-y-6 py-1">
      <div className="h-2 bg-slate-200 rounded"></div>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div className="h-2 bg-slate-200 rounded col-span-2"></div>
          <div className="h-2 bg-slate-200 rounded col-span-1"></div>
        </div>
        <div className="h-2 bg-slate-200 rounded"></div>
      </div>
    </div>
  </div>
);

const StreamingComponent = ({ currentLlmResponse }: { currentLlmResponse: string }) => {
  return (
    <>
      {currentLlmResponse && (
        <div className="dark:bg-slate-800 bg-white shadow-lg rounded-lg p-4 mt-4">
          <div className="dark:text-gray-300 text-gray-800">
            <Markdown>{currentLlmResponse}</Markdown>
          </div>
        </div>
      )}
    </>
  );
};

const LLMResponseComponent: React.FC<LLMResponseComponentProps> = ({
  llmResponse,
  currentLlmResponse,
  index,
  isStreaming
}) => {
  const hasLlmResponse = llmResponse && llmResponse.trim().length > 0;

  return (
    <>
      {isStreaming && !hasLlmResponse ? (
        <div className="dark:bg-slate-800 bg-white shadow-lg rounded-lg p-4 mt-4">
          <ShimmerEffect />
        </div>
      ) : hasLlmResponse ? (
        <div className="dark:bg-slate-800 bg-white shadow-lg rounded-lg p-4 mt-4">
          <div className="dark:text-gray-300 text-gray-800 markdown-container">
            <Markdown>{llmResponse}</Markdown>
          </div>
        </div>
      ) : (
        <StreamingComponent currentLlmResponse={currentLlmResponse} />
      )}
    </>
  );
};

export default LLMResponseComponent;