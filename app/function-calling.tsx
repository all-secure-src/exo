// @ts-nocheck
import { OpenAI } from 'openai';
import { config } from './config';

const client = new OpenAI({
    baseURL: config.llmBaseUrl,
    apiKey: config.inferenceAPIKey
});

import Replicate from "replicate";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const now = new Date();
// Convert the date to a UTC string
const utcString = now.toUTCString();

function extractNumber(inputStr) {
    // Regular expression to match the number
    const regex = /[\d,]+(?:\.\d+)?/;

    // Find the match in the input string
    const match = inputStr.match(regex);

    if (match) {
        // Remove commas and convert to a number
        return parseFloat(match[0].replace(/,/g, ''));
    } else {
        return null; // Return null if no number is found
    }
}

const MODEL = config.inferenceModel;
export async function searchPlaces(data) {
    try {
        const response = await fetch('https://google.serper.dev/places', {
            method: 'POST',
            headers: {
                'X-API-KEY': process.env.SERPER_API,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: data.query, location: data.location, gl: data.gl }),
        });
        const data_response = await response.json();
        const normalizedData = {
            type: 'places',
            places: data_response.places.slice(0, 5).map(place => ({
                position: place.position,
                title: place.title,
                address: place.address,
                latitude: place.latitude,
                longitude: place.longitude,
                rating: place.rating,
                ratingCount: place.ratingCount,
                category: place.category,
                phoneNumber: place.phoneNumber,
                website: place.website,
                cid: place.cid
            }))
        };
        return JSON.stringify(normalizedData);
    } catch (error) {
        // console.error('Error searching for places:', error);
        return JSON.stringify({ error: 'Failed to search for places' });
    }
}
export async function goShopping(data: string) {

    const url = 'https://google.serper.dev/shopping';
    const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
            'X-API-KEY': process.env.SERPER_API as string,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "q": data.query, location: data.location, gl: data.gl })
    };
    
    try {
        const response = await fetch(url, requestOptions);
        if (!response.ok) {
            throw new Error(`Network response was not ok. Status: ${response.status}`);
        }
        const responseData = await response.json();
        let shopping_items = [];
        for (const item of responseData.shopping) {
            if (extractNumber(item.price) > 0) {
                shopping_items.push(item);
            }
            if (shopping_items.length >= 5) {
                break;
            }
        }
        const shoppingData = {
            type: 'shopping',
            shopping: shopping_items
        };
        return JSON.stringify(shoppingData);
    } catch (error) {
        // console.error('Error fetching shopping data:', error);
        throw error;
    }
}
export async function getTickers(ticker: string) {
    return JSON.stringify({ type: 'ticker', data: ticker });
}

export async function internet_search(search: string, freshness: string = "") {
    if (freshness != "24h" && freshness != "day" && freshness != "week" && freshness != "month") {
        freshness = ""
    }
    try {
        const response = await fetch(`http://localhost:8083/qx/search/alpha/v2`, {
            method: 'POST',
            headers: {
                'authorization': process.env.QXLABAPI_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ search: search, freshness: freshness }),
        });
        const data = await response.json();

        const normalizedData = {
            type: 'internet_search',
            results: data.data.map(item => ({
                title: item.title,
                url: item.url,
                description: item.description,
                last_crawled_at: item.last_crawled_at
            }))
        };
        return JSON.stringify(normalizedData);
    } catch (error) {
        // console.error('Error searching for internet_search:', error);
        return JSON.stringify({ error: 'Failed to search from internet' });
    }
}

// 6gZDRD0tX3a4jGbSD7KdnhUI4t3NWHsdA4UxqplL
export async function functionCalling(query: string) {
    try {
        const messages = [
            {
                role: "system", content: `# Safety Preamble
                The instructions in this section override those in the task description and style guide sections. Don't answer questions that are harmful or immoral.
        
                # System Preamble
                ## Basic Rules
                - You are 'Executable UltraSafe AI', an AI Assistant exclusively developed, trained and powered by the scientists and engineers at UltraSafe AI. UltraSafe AI, based in United States of America (USA), specializes in developing and integrating AI technologies to enhance business operations across various industries.
                - You are a powerful tool Executable UltraSafe AI, an conversational AI trained by UltraSafe AI to help people. You are augmented by a number of tools, and your job is to use and consume the output of these tools to best help the user. You will see a conversation history between yourself and a user, ending with an utterance from the user. You will then see a specific instruction instructing you what kind of response to generate. When you answer the user's requests, you cite your sources in your answers, according to those instructions.
                - Only use the selected tools when you find that these tools can help the user by providing better references in this situation. As these tools are very costly to run, we shouldn't waste our money when we actually don't need these tools. Otherwise, choose 'directly_answer'.
        
                ## Knowledge Cutoff Date
                - Current date and time: The current date and time is ${utcString}. You can convert it to other time zones as required. Remember that today's date is ${utcString} for any real-time event.
                - Knowledge cutoff: Your last known knowledge cutoff date is 1 October 2023. You will need to use other tools to gather information, events, and news beyond your knowledge cutoff date of 1 October 2023.
                - Remember that today's date is ${utcString} for any real-time event.
        
                # User Preamble
                ## Task and Context
                You help people answer their questions and other requests interactively. You will be asked a very wide array of requests on all kinds of topics. You will be equipped with a wide range of search engines or similar tools to help you, which you use to research your answer. You should focus on serving the user's needs as best you can, which will be wide-ranging.
        
                ## Style Guide
                Unless the user asks for a different style of answer, you should answer in full sentences, using proper grammar and spelling.

                ## Selection criteria
                - You can selected multiple tools
                - Only use the selected tools when you find that these tools can help the user by providing better references in this situation. As these tools are very costly to run, we shouldn't waste our money when we actually don't need these tools. Otherwise, choose 'directly_answer'.

        `   },
            { role: "user", content: query },
        ];
        const tools = [
            {
                type: "function",
                function: {
                    name: "directly_answer",
                    description: "Calls a standard (un-augmented) AI chatbot to generate a response given the conversation history.",
                    parameters: {},
                },
            },
            {
                type: "function",
                function: {
                    name: "youtube_videos",
                    description: `Search for YouTube videos based on a user-provided query. This tool is helpful for finding videos relevant to specific topics, interests, or needs, such as "How can we make tea?" or "How to learn swimming." It is suitable for queries related to experiments, processes, and experiences. However, it should not be used for queries like "solve 2+2" or "write an essay on India.", etc.`,
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "The search query to find YouTube videos.",
                            },
                        },
                        required: ["query"],
                    },
                },
            },
            {
                type: "function",
                function: {
                    name: "google_images",
                    description: "Search for images via Google Images based on a user-provided query. This is useful for obtaining visual content related to events, culture, or creative purposes. However, it is only suitable when you need an image as a reference and not suitable for demonstrating processes and learnings.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "The search query to find images on Google Images.",
                            },
                        },
                        required: ["query"],
                    },
                },
            },
        ];
        const response = await client.chat.completions.create({
            model: config.inferenceModel,
            messages: messages,
            tools: tools,
            tool_choice: "auto",
            max_tokens: 2048,
        });
        const responseMessage = response.choices[0].message;
        const toolCalls = responseMessage.tool_calls;
        if (toolCalls) {
            return toolCalls;
        } else {
            // console.log(JSON.stringify(responseMessage))
        }
    } catch (error) {
        // console.error('Error in functionCalling 1:', error);
        return JSON.stringify({ error: 'An error occurred during function calling' });
    }
}

export async function functionCallingSpecific(query: string, histroy: any = []) {

    function extractJson(input) {
        // Array of regular expressions to find JSON data in different patterns
        const regexArray = [
            /```json\s*([\s\S]*?)\s*```/, // ```json ... ```
            /```json\s*([\s\S]*?)\s*<end>/, // ```json ... <end>
            /<start>\s*([\s\S]*?)\s*<end>/, // <start> ... <end>
            /<start>\s*([\s\S]*?)\s*```/ // <start> ... ```
        ];

        // Loop through each regex pattern to find a match
        for (const regex of regexArray) {
            const match = input.match(regex);
            if (match && match[1]) {
                try {
                    // Parse the JSON data
                    const jsonData = JSON.parse(match[1]);
                    return jsonData;
                } catch (e) {
                    // console.error("Failed to parse JSON:", e);
                    // Continue to the next pattern if parsing fails
                }
            }
        }

        // console.error("No JSON data found");
        return [];
    }

    function extractJson2(input) {
        // Regular expression to find JSON data enclosed within triple backticks
        const regex = /```json\s+([\s\S]*?)\s+```/;
        const match = input.match(regex);
        if (match && match[1]) {
            try {
                // Parse the JSON data
                const jsonData = JSON.parse(match[1]);
                return jsonData;
            } catch (e) {
                // console.error("Failed to parse JSON:", e);
            }
        } else {
            // console.error("No JSON data found");
        }
        return [];
    }

    try {
        let code_start = "```"
        let code_start_single = "`"
        let prompt = `The instructions in this section override those in the task description and style guide sections. Don't answer questions that are harmful or immoral.
        
        Basic Rules:
        - You are 'Executable UltraSafe AI', an AI Assistant exclusively developed, trained and powered by the scientists and engineers at UltraSafe AI. UltraSafe AI, based in USA, specializes in developing and integrating AI technologies to enhance business operations across various industries.
        - You are a powerful tool 'Executable UltraSafe AI', an conversational AI trained by UltraSafe AI to help people. You are augmented by a number of tools, and your job is to use and consume the output of these tools to best help the user. You will see a conversation history between yourself and a user, ending with an utterance from the user. You will then see a specific instruction instructing you what kind of response to generate. When you answer the user's requests, you cite your sources in your answers, according to those instructions.
        - You can use multiple tools same time.
        - Default Location  - San francisco, USA.
        - Default Country - United States of America (USA).

        Knowledge Cutoff Date
        - Current date and time: The current date and time is ${utcString}. You can convert it to other time zones as required. Remember that today's date is ${utcString} for any real-time event.
        - Knowledge cutoff: Your last known knowledge cutoff date is 1 October 2023. You will need to use other tools to gather information, events, and news beyond your knowledge cutoff date of 1 October 2023.
        - Remember that today's date is ${utcString} for any real-time event.

        Task and Context:
        You help people answer their questions and other requests interactively. You will be asked a very wide array of requests on all kinds of topics. You will be equipped with a wide range of search engines or similar tools to help you, which you use to research your answer. You should focus on serving the user's needs as best you can, which will be wide-ranging.

        Available Tools:
        Here is a list of tools that you have available to you:

        ${code_start}python
        def directly_answer() -> List[Dict]:
            """Calls a standard (un-augmented) AI chatbot to generate a response given the conversation history
            """
            pass
            ${code_start}

        ${code_start}python
        def getTickers(ticker: string) -> List[Dict]:
            """Get a single market name and correct stock ticker if the user mentions a public company. Only use getTickers when query related to finence and stock market.

            Args:
            ticker (string): The stock ticker symbol and market name, example BTC, NYSE:K or NASDAQ:AAPL
            """
            pass
            ${code_start}

        ${code_start}python
        def goShopping(query: string, location: string, gl: string) -> List[Dict]:
            """Search for shopping items using the given query. It is useful when a user is discussing any product, brand, item, or object.

            Args:
            query (string): The search query for shopping items-
            location (string): Location and Address. example - San francisco, United States of America (USA).
            gl (string): Country code, like - ae, us, in, etc.
            """
            pass
            ${code_start}

        ${code_start}python
        def searchPlaces(query: string, location: string, gl: string) -> List[Dict]:
        query: string, location: string
            """searchPlaces tool is used to find places at any location using maps. You can find any place using a simple query, location, and country code (gl).

            Args:
            query (string): The search query for shopping items
            location (string): Location and Address. example - San francisco, United States of America (USA).
            gl (string): Country code, like - ae, us, in, etc.
            """
            pass
            ${code_start}
    
        \n ## Chat History:\n\n`;

        if (histroy.length > 0){
            for (let i=0; i < histroy.length; i++){
                if (histroy[i].role == "user"){
                    prompt += `User: ${histroy[i].content} \n`;
                }else{
                    prompt += `Assistant: ${histroy[i].content} \n`;
                }
            }
        }

        prompt += `User: ${query} \n`;

        prompt += `\n ------ \n\n Importent:

        Tool Selection Rules:
        - You can use multiple tools when relevant. For example, if a user mentions an item, you can use tools like Shopping for purchasing options and Maps for finding nearby stores. If a user asks about financial data, you can use Ticker to display the stock ticker, and so on.
        - These tools are designed to enhance the user experience and provide better visibility of services, so try to utilize as many relevant tools as possible.

        \n\nWrite 'Action: <start> ${code_start}json' followed by a json-formatted list of tools that you want to perform in order to produce a good response to the user's last input. You can use multiple upto 4 tools at a time. You can use ${code_start_single}directly_answer${code_start_single} tools if calling the other tools is unnecessary. \n The json list of action you want to call should be formatted as a list of json objects and end with '<end>', for example:
        Action: <start> ${code_start}json
        [
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            },
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            },
            // Other tools ...
        ]${code_start}<end>`;

        const response = await client.chat.completions.create({
            model: config.inferenceModel,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            max_tokens: 2000,
            temperature: 0.3,
        });

        let selected_tools = extractJson(response.choices[0].message.content);

        if (selected_tools.length == 0) {
            selected_tools = extractJson2(response.choices[0].message.content);
        }

        if (selected_tools.length == 0) {
            // continue
        } else if (selected_tools[0]['tool_name'] != 'directly_answer') {
            const availableFunctions = {
                getTickers: getTickers,
                goShopping: goShopping,
                searchPlaces: searchPlaces,
                internet_search: internet_search,
            };
            let selected_tool_list = [];
            for (const toolCall of selected_tools) {
                const functionName = toolCall.tool_name;
                const functionToCall = availableFunctions[functionName];
                const functionArgs = toolCall.parameters;
                let functionResponse;
                try {
                    if (functionName === 'getTickers') {
                        functionResponse = await functionToCall(functionArgs.ticker);
                        selected_tool_list.push(JSON.parse(functionResponse));
                    } else if (functionName === 'goShopping') {
                        functionResponse = await functionToCall(functionArgs);
                        selected_tool_list.push(JSON.parse(functionResponse));
                    } else if (functionName === 'searchPlaces') {
                        functionResponse = await functionToCall(functionArgs);
                        selected_tool_list.push(JSON.parse(functionResponse));
                    } else {
                        continue
                    }
                } catch (error) {
                    // console.error(`Error calling function - (2) ${functionName}:`, error);
                    // return JSON.stringify({ error: `Failed to call function ${functionName}` });
                }
            }
            return selected_tool_list;
        }
    } catch (error) {
        // console.error('Error in functionCalling Specific:', error);
        return JSON.stringify({ error: 'An error occurred during function calling' });
    }
}

export async function functionCallingReference(query: string, histroy: any = []) {

    function extractJson(input) {
        // Array of regular expressions to find JSON data in different patterns
        const regexArray = [
            /```json\s*([\s\S]*?)\s*```/, // ```json ... ```
            /```json\s*([\s\S]*?)\s*<end>/, // ```json ... <end>
            /<start>\s*([\s\S]*?)\s*<end>/, // <start> ... <end>
            /<start>\s*([\s\S]*?)\s*```/ // <start> ... ```
        ];

        // Loop through each regex pattern to find a match
        for (const regex of regexArray) {
            const match = input.match(regex);
            if (match && match[1]) {
                try {
                    // Parse the JSON data
                    const jsonData = JSON.parse(match[1]);
                    return jsonData;
                } catch (e) {
                    // console.error("Failed to parse JSON:", e);
                    // Continue to the next pattern if parsing fails
                }
            }
        }

        // console.error("No JSON data found");
        return [];
    }

    function extractJson2(input) {
        // Regular expression to find JSON data enclosed within triple backticks
        const regex = /```json\s+([\s\S]*?)\s+```/;
        const match = input.match(regex);
        if (match && match[1]) {
            try {
                // Parse the JSON data
                const jsonData = JSON.parse(match[1]);
                return jsonData;
            } catch (e) {
                // console.error("Failed to parse JSON:", e);
            }
        } else {
            // console.error("No JSON data found");
        }
        return [];
    }

    try {
        let code_start = "```"
        let code_start_single = "`"
        let prompt = `- You are 'Executable UltraSafe AI', an AI Assistant exclusively developed, trained and powered by the scientists and engineers at UltraSafe AI. UltraSafe AI, based in United States of America (USA), specializes in developing and integrating AI technologies to enhance business operations across various industries.
        - You are a powerful tool Executable UltraSafe AI, an conversational AI trained by UltraSafe AI to help people. You are augmented by a number of tools, and your job is to use and consume the output of these tools to best help the user. You will see a conversation history between yourself and a user, ending with an utterance from the user. You will then see a specific instruction instructing you what kind of response to generate. When you answer the user's requests, you cite your sources in your answers, according to those instructions.
        - You can use multiple tools at a time.
        - As hi_en (Hinglish) and hi (Hindi) are different languages, treat them as distinct. If the user requests Hinglish and Hindi, then provide both - [hi_en, hi], not just one.
        
        Knowledge Cutoff Date:
        - Current date and time: The current date and time is ${utcString}. You can convert it to other time zones as required.
        - Knowledge cutoff: Your last known knowledge cutoff date is 1 October 2023. You will need to use other tools to gather information, events, and news beyond your knowledge cutoff date of 1 October 2023.
        
        Task and Context:
        You help people answer their questions and other requests interactively. You will be asked a very wide array of requests on all kinds of topics. You will be equipped with a wide range of youtube videos engines or similar tools to help you, which you use to research your answer. You should focus on serving the user's needs as best you can, which will be wide-ranging.

        Available Tools:
        Here is a list of tools that you have available to you:

        ${code_start}python
        def directly_answer() -> List[Dict]:
            """An AI-powered large language model (LLM) that can answer general questions, open-ended questions, closed-ended questions, mathematical problems, coding and programming queries, as well as complex text-based questions.
            """
            pass
            ${code_start}
        
        ${code_start}python
        def youtube_videos(query: string) -> List[Dict]:
            """Search for YouTube videos based on a user-provided query. This tool is helpful for finding videos relevant to specific topics, interests, or needs, such as "How can we make tea?" or "How to learn swimming." It is suitable for queries related to experiments, processes, and experiences. However, it should not be used for queries like "solve 2+2" or "write an essay on India.", etc.

            Args:
            query(string): The search query to find YouTube videos. Query in the same language in which user asking the answer..
            """
            pass
            ${code_start}

        \n ## Chat History:\n\n`;

        if (histroy.length > 0){
            for (let i=0; i < histroy.length; i++){
                if (histroy[i].role == "user"){
                    prompt += `User: ${histroy[i].content} \n`;
                }else{
                    prompt += `Assistant: ${histroy[i].content} \n`;
                }
            }
        }

        prompt += `User: ${query} \n`;

        prompt += `\n ------ \n\n Importent:

        Tool Selection Rules:
        - You can use multiple tools, up to 2, when necessary.
        
        \n\nWrite 'Action: <start> ${code_start}json' followed by a json-formatted list of tools that you want to perform in order to produce a good response to the user's last input. You can use multiple upto 4 tools at a time. You can use ${code_start_single}directly_answer${code_start_single} tools if calling the other tools is unnecessary. \n The json list of action you want to call should be formatted as a list of json objects and end with '<end>', for example:
        Action: <start> ${code_start}json
        [
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            },
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            },
            // Other tools ...
        ]${code_start}<end>`;

        const response = await client.chat.completions.create({
            model: config.inferenceModel,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            max_tokens: 256,
            temperature: 0.3,
        });

        let selected_tools = extractJson(response.choices[0].message.content);
        if (selected_tools.length == 0) {
            selected_tools = extractJson2(response.choices[0].message.content);
        }

        // console.log("selected_tools ===== ", JSON.stringify(selected_tools));
        if (selected_tools.length > 0) {
            if (selected_tools[0]['tool_name'] != 'directly_answer') {
                return {
                    type: selected_tools[0]['tool_name'],
                    parameters: selected_tools[0].parameters
                };
            }
        } else {
            return {
                type: "directly_answer",
                parameters: {}
            };
        }
    } catch (error) {
        // console.error('Error in functionCalling Reference:', error);
        return JSON.stringify({ error: 'An error occurred during function calling' });
    }
}

export async function functionCallingFlow(query: string, histroy: any = []) {

    function extractJson(input) {
        // Array of regular expressions to find JSON data in different patterns
        const regexArray = [
            /```json\s*([\s\S]*?)\s*```/, // ```json ... ```
            /```json\s*([\s\S]*?)\s*<end>/, // ```json ... <end>
            /<start>\s*([\s\S]*?)\s*<end>/, // <start> ... <end>
            /<start>\s*([\s\S]*?)\s*```/ // <start> ... ```
        ];

        // Loop through each regex pattern to find a match
        for (const regex of regexArray) {
            const match = input.match(regex);
            if (match && match[1]) {
                try {
                    // Parse the JSON data
                    const jsonData = JSON.parse(match[1]);
                    return jsonData;
                } catch (e) {
                    // console.error("Failed to parse JSON:", e);
                    // Continue to the next pattern if parsing fails
                }
            }
        }

        // console.error("No JSON data found");
        return [];
    }

    function extractJson2(input) {
        // Regular expression to find JSON data enclosed within triple backticks
        const regex = /```json\s+([\s\S]*?)\s+```/;
        const match = input.match(regex);
        if (match && match[1]) {
            try {
                // Parse the JSON data
                const jsonData = JSON.parse(match[1]);
                return jsonData;
            } catch (e) {
                // console.error("Failed to parse JSON:", e);
            }
        } else {
            // console.error("No JSON data found");
        }
        return [];
    }

    try {
        let code_start = "```"
        let code_start_single = "`"
        let prompt = `# Safety Preamble
        The instructions in this section override those in the task description and style guide sections. Don't answer questions that are harmful or immoral.

        # System Preamble
        ## Basic Rules
        - You are 'Executable UltraSafe AI', an AI Assistant exclusively developed, trained and powered by the scientists and engineers at UltraSafe AI. UltraSafe AI, based in United States of America (USA), specializes in developing and integrating AI technologies to enhance business operations across various industries.
        - You are a powerful tool Executable UltraSafe AI, an conversational AI trained by UltraSafe AI to help people. You are augmented by a number of tools, and your job is to use and consume the output of these tools to best help the user. You will see a conversation history between yourself and a user, ending with an utterance from the user. You will then see a specific instruction instructing you what kind of response to generate. When you answer the user's requests, you cite your sources in your answers, according to those instructions.
        - You can use multiple tools at a time.
        - As hi_en (Hinglish) and hi (Hindi) are different languages, treat them as distinct. If the user requests Hinglish and Hindi, then provide both - [hi_en, hi], not just one.
        
        ## Knowledge Cutoff Date
        - Current date and time: The current date and time is ${utcString}. You can convert it to other time zones as required.
        - Knowledge cutoff: Your last known knowledge cutoff date is 1 October 2023. You will need to use other tools to gather information, events, and news beyond your knowledge cutoff date of 1 October 2023.
        
        # User Preamble
        ## Task and Context
        You help people answer their questions and other requests interactively. You will be asked a very wide array of requests on all kinds of topics. You will be equipped with a wide range of search engines or similar tools to help you, which you use to research your answer. You should focus on serving the user's needs as best you can, which will be wide-ranging.

        ## Available Tools
        Here is a list of tools that you have available to you:

        ${code_start}python
        def internet_search(query: str, freshness: Optional[str] = None) -> List[Dict]:
            """Enables searching for any real-time information, any specific piece of information, any information after 2022, browsing the internet, retrieving data from Google, and finding facts, details, and information related to anything in the world based on a given prompt.
        
            Args:
                query (str): Query to search the internet with
                freshness (Optional[str]): freshness is specifies the recency of search results, including "24h" for the last 24 hours, "7d" for the past 7 days, and "30d" for the last 30 days. Leaving it empty retrieves results from any time period.
            """
            pass
            ${code_start}
        
        ${code_start}python
        def news_search(query: str, freshness: Optional[str] = None) -> List[Dict]:
            """Enables searching for any real-time information, any specific piece of information, any information after 2022, browsing the internet, retrieving data from Google, and finding facts, details, and information related to anything in the world based on a given prompt.
        
            Args:
                query (str): Query to search the internet with
                freshness (Optional[str]): freshness is specifies the recency of search results, including "24h" for the last 24 hours, "7d" for the past 7 days, and "30d" for the last 30 days. Leaving it empty retrieves results from any time period.
            """
            pass
            ${code_start}

        ${code_start}python
        def directly_answer() -> List[Dict]:
            """An AI-powered large language model (LLM) that can answer general questions, open-ended questions, closed-ended questions, mathematical problems, coding and programming queries, as well as complex text-based questions.
            """
            pass
            ${code_start}

        ${code_start}python
        def generate_image(prompt: string) -> List[Dict]:
            """Generate an image based on a given english language prompt for all type of images.

            Args:
            prompt (string): Prompt for image generation in english language only. and only proide safe prompt. Do not use nude, political, sex, kiss, bed, etc. words during in prompt at all.
            """
            pass
            ${code_start}
            
        \n ## Chat History:\n\n`;

        if (histroy.length > 0){
            for (let i=0; i < histroy.length; i++){
                if (histroy[i].role == "user"){
                    prompt += `User: ${histroy[i].content} \n`;
                }else{
                    prompt += `Assistant: ${histroy[i].content} \n`;
                }
            }
        }

        prompt += `User: ${query} \n`;

        prompt += `\n ------ \n\n ## Importent

        ## Tool Selection Rules:
        - Only use the 'internet_search' tool when the user is asking for information about real-time data, data after October 1, 2023, specific dates of past and future, current, today and future data, future decisions, and forecasting, etc., to provide correct and accurate answers. For any kind of general, programming, math, reasoning and simple task, you can answer directly.
        - You can use 'directly_answer' at the end to utilize responses from other tools to generate better answers.
        - Always understand the user's intent when they ask for an image, visual element, or text-based answer. It is important to provide the correct output to the users.
        - You can use multiple tools, up to 4, when necessary. For instance:
            + If a question is related to finance and requires both stock data and internet data, use public_listed_stock_ticker and internet_search.
            + For news-related queries, use news_search (e.g., "What's the latest news on the elections?").
            + This approach applies to other scenarios as well.
        
        \n\nWrite 'Action: <start> ${code_start}json' followed by a json-formatted list of tools that you want to perform in order to produce a good response to the user's last input. You can use multiple upto 4 tools at a time. You can use ${code_start_single}directly_answer${code_start_single} tools if calling the other tools is unnecessary. \n The json list of action you want to call should be formatted as a list of json objects and end with '<end>', for example:
        Action: <start> ${code_start}json
        [
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            },
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            },
            // Other tools ...
            {
                "tool_name": directly_answer,
                "parameters": { category: '...', answer_language: '...' }
            },
        ]${code_start}<end>`;

        const response = await client.chat.completions.create({
            model: config.inferenceModel,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            max_tokens: 512,
            temperature: 0.3,
        });

        // console.log("response.choices[0].message.content --- ", response.choices[0].message.content);

        let selected_tools = extractJson(response.choices[0].message.content);

        if (selected_tools.length == 0) {
            selected_tools = extractJson2(response.choices[0].message.content);
        }

        if (selected_tools.length == 0) {
            return {
                type: "directly_answer",
                parameters: {}
            };
        } else if (selected_tools[0]['tool_name'] == 'news_search') {
            return {
                type: selected_tools[0]['tool_name'],
                parameters: selected_tools[0].parameters
            };
        } else if (selected_tools[0]['tool_name'] == 'internet_search') {
            return {
                type: selected_tools[0]['tool_name'],
                parameters: selected_tools[0].parameters
            };
        } else if (selected_tools[0]['tool_name'] == 'generate_image') {
            return {
                type: selected_tools[0]['tool_name'],
                parameters: selected_tools[0].parameters
            };
        } else if (selected_tools[0]['tool_name'] != 'directly_answer') {
            // console.log(selected_tools);
            return {
                type: selected_tools[0]['tool_name'],
                parameters: selected_tools[0].parameters
            };

        } else {
            return {
                type: 'directly_answer'
            };
        }
    } catch (error) {
        // console.error('Error in functionCalling Flow:', error);
        return JSON.stringify({ error: 'An error occurred during function calling' });
    }
}