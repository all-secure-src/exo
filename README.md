<h1 align="center">Perplexity-Inspired LLM Answer Engine</h1>
<div>
    <div align="center">
        <a href="https://twitter.com/dev__digest">
            <img src="https://img.shields.io/badge/X/Twitter-000000?style=for-the-badge&logo=x&logoColor=white" />
        </a>
        <a href="https://www.youtube.com/@developersdigest">
            <img src="https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" />
        </a>
    </div>
    <div align="center">
    <a href="https://trendshift.io/repositories/8642" target="_blank"><img src="https://trendshift.io/api/badge/repositories/8642" alt="developersdigest%2Fllm-answer-engine | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
    </div>
</div>

[Watch the tutorial here](https://youtu.be/kFC-OWw7G8k) for a detailed guide on setting up and running this project.

![Example](https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmJ0ZnhmNjkwYzczZDlqZzM1dDRka2k1MGx6dW02ZHl5dzV0aGQwMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/mluzeYSMGoAnSXg0ft/giphy.gif)

This repository contains the code and instructions needed to build a sophisticated answer engine that leverages the capabilities of [Groq](https://www.groq.com/), [Mistral AI's Mixtral](https://mistral.ai/news/mixtral-of-experts/), [Langchain.JS](https://js.langchain.com/docs/), [Brave Search](https://search.brave.com/), [Serper API](https://serper.dev/), and [OpenAI](https://openai.com/). Designed to efficiently return sources, answers, images, videos, and follow-up questions based on user queries, this project is an ideal starting point for developers interested in natural language processing and search technologies.

## Technologies Used

- **Next.js**: A React framework for building server-side rendered and static web applications.
- **Tailwind CSS**: A utility-first CSS framework for rapidly building custom user interfaces.
- **Vercel AI SDK**: The Vercel AI SDK is a library for building AI-powered streaming text and chat UIs.
- **Groq & Mixtral**: Technologies for processing and understanding user queries.
- **Langchain.JS**: A JavaScript library focused on text operations, such as text splitting and embeddings.
- **Brave Search**: A privacy-focused search engine used for sourcing relevant content and images.
- **Serper API**: Used for fetching relevant video and image results based on the user's query.
- **OpenAI Embeddings**: Used for creating vector representations of text chunks.
- **Cheerio**: Utilized for HTML parsing, allowing the extraction of content from web pages.
- **Ollama (Optional)**: Used for streaming inference and embeddings.

## Getting Started

### Prerequisites

- Ensure Node.js and npm are installed on your machine.
- Obtain API keys from OpenAI, Groq, Brave Search, and Serper.

### Obtaining API Keys

- **OpenAI API Key**: [Generate your OpenAI API key here](https://platform.openai.com/account/api-keys).
- **Groq API Key**: [Get your Groq API key here](https://console.groq.com/keys).
- **Brave Search API Key**: [Obtain your Brave Search API key here](https://brave.com/search/api/).
- **Serper API Key**: [Get your Serper API key here](https://serper.dev/).

### Installation

1. Clone the repository:
    ```
    git clone https://github.com/developersdigest/llm-answer-engine.git
    ```
2. Install the required dependencies:
    ```
    npm install
    ```
    or
    ```
    bun install
    ```
3. Create a `.env` file in the root of your project and add your API keys:
    ```
    OPENAI_API_KEY=your_openai_api_key
    GROQ_API_KEY=your_groq_api_key
    BRAVE_SEARCH_API_KEY=your_brave_search_api_key
    SERPER_API=your_serper_api_key
    ```

### Running the Server

To start the server, execute:
```
npm run dev
```
or
```
bun run dev
```

the server will be listening on the specified port.

## Editing the Configuration

The configuration file is located in the `app/config.tsx` file. You can modify the following values

- useOllamaInference: false,
- useOllamaEmbeddings: false,
- inferenceModel: 'mixtral-8x7b-32768', 
- inferenceAPIKey: process.env.GROQ_API_KEY, 
- embeddingsModel: 'text-embedding-3-small', 
- textChunkSize: 800, 
- textChunkOverlap: 200, 
- numberOfSimilarityResults: 2,
- numberOfPagesToScan: 10, 
- nonOllamaBaseURL: 'https://api.groq.com/openai/v1'
- useFunctionCalling: true

### Function Calling Support (Beta)
Currently, function calling is supported with the following capabilities:

- Maps and Locations (Serper Locations API)
- Shopping (Serper Shopping API)
- TradingView Stock Data (Free Widget)
- Any functionality that you would like to see here, please open an issue or submit a PR.
- To enable function calling and conditional streaming UI (currently in beta), ensure useFunctionCalling is set to true in the config file.

### Ollama Support (Partially supported)
Currently, streaming text responses are supported for Ollama, but follow-up questions are not yet supported.

Embeddings are supported, however, time-to-first-token can be quite long when using both a local embedding model as well as a local model for the streaming inference. I  recommended decreasing a number of the RAG values specified in the `app/config.tsx` file to decrease the time-to-first-token when using Ollama.

To get started, make sure you have the Ollama running model on your local machine and set within the config the model you would like to use and set use OllamaInference and/or useOllamaEmbeddings to true.

Note: When 'useOllamaInference' is set to true, the model will be used for both text generation, but it will skip the follow-up questions inference step when using Ollama.

More info: https://ollama.com/blog/openai-compatibility
