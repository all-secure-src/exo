// @ts-nocheck
import { OpenAI } from 'openai';
import { config } from './config';
const client = new OpenAI({
    baseURL: config.nonOllamaBaseURL,
    apiKey: config.inferenceAPIKey
});
import { CohereClient } from "cohere-ai";
const cohere = new CohereClient({
    token: "pWTp76JUbHZ7b6zbbFteby3L6QsDcRc5Q25p0Omn",
});

import Replicate from "replicate";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const now = new Date();
// Convert the date to a UTC string
const utcString = now.toUTCString();

const MODEL = config.inferenceModel;
export async function searchPlaces(query: string, location: string) {
    try {
        const response = await fetch('https://google.serper.dev/places', {
            method: 'POST',
            headers: {
                'X-API-KEY': process.env.SERPER_API,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: query, location: location }),
        });
        const data = await response.json();
        const normalizedData = {
            type: 'places',
            places: data.places.map(place => ({
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
        console.error('Error searching for places:', error);
        return JSON.stringify({ error: 'Failed to search for places' });
    }
}
export async function goShopping(message: string) {
    const url = 'https://google.serper.dev/shopping';
    const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
            'X-API-KEY': process.env.SERPER_API as string,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "q": message })
    };
    try {
        const response = await fetch(url, requestOptions);
        if (!response.ok) {
            throw new Error(`Network response was not ok. Status: ${response.status}`);
        }
        const responseData = await response.json();
        const shoppingData = {
            type: 'shopping',
            shopping: responseData.shopping
        };
        return JSON.stringify(shoppingData);
    } catch (error) {
        console.error('Error fetching shopping data:', error);
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
        const response = await fetch(`${process.env.QXLABAPI_DOMAIN}/qx/search/alpha/v2`, {
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
        console.error('Error searching for internet_search:', error);
        return JSON.stringify({ error: 'Failed to search from internet' });
    }
}

export async function generate_image(prompt: string) {
    try {
        const output = await replicate.run(
            "ai-forever/kandinsky-2.2:424befb1eae6af8363edb846ae98a11111a39740988baebd279d73fe3ecc92c2",
            {
                input: {
                    width: 1024,
                    height: 1024,
                    prompt: prompt,
                    num_outputs: 2,
                    num_inference_steps: 75
                }
            }
        );

        const normalizedData = {
            type: 'generate_image',
            images: [
                {
                    "prompt": prompt,
                    "index": 1,
                    "image": output[0]
                },
                {
                    "prompt": prompt,
                    "index": 2,
                    "image": output[1]
                }
            ]
        };
        return JSON.stringify(normalizedData);
    } catch (error) {
        console.error('Error searching for generate_image:', error);
        return JSON.stringify({ error: 'Failed to generate image' });
    }
}

export async function generate_human_image(prompt: string) {
    try {
        const output = await replicate.run(
            "ai-forever/kandinsky-2.2:424befb1eae6af8363edb846ae98a11111a39740988baebd279d73fe3ecc92c2",
            {
                input: {
                    width: 1024,
                    height: 1024,
                    prompt: prompt,
                    num_outputs: 2,
                    num_inference_steps: 75
                }
            }
        );

        const normalizedData = {
            type: 'generate_human_image',
            images: [
                {
                    "prompt": prompt,
                    "index": 1,
                    "image": output[0]
                },
                {
                    "prompt": prompt,
                    "index": 2,
                    "image": output[1]
                },
            ]
        };
        return JSON.stringify(normalizedData);
    } catch (error) {
        console.error('Error searching for generate_human_image:', error);
        return JSON.stringify({ error: 'Failed to generate human image' });
    }
}

// pWTp76JUbHZ7b6zbbFteby3L6QsDcRc5Q25p0Omn
export async function functionCalling(query: string) {
    try {
        const messages = [
            {
                role: "system", content: `# Safety Preamble
                The instructions in this section override those in the task description and style guide sections. Don't answer questions that are harmful or immoral.
        
                # System Preamble
                ## Basic Rules
                - You are a powerful tool Omega, an conversational AI trained by QXLABAI to help people. You are augmented by a number of tools, and your job is to use and consume the output of these tools to best help the user. You will see a conversation history between yourself and a user, ending with an utterance from the user. You will then see a specific instruction instructing you what kind of response to generate. When you answer the user's requests, you cite your sources in your answers, according to those instructions.
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
            model: MODEL,
            messages: messages,
            tools: tools,
            tool_choice: "auto",
            max_tokens: 2048,
        });
        const responseMessage = response.choices[0].message;
        const toolCalls = responseMessage.tool_calls;
        if (toolCalls) {
            return toolCalls;
        }else{
            console.log(JSON.stringify(responseMessage))
        }
    } catch (error) {
        console.error('Error in functionCalling:', error);
        return JSON.stringify({ error: 'An error occurred during function calling' });
    }
}

export async function functionCallingSpecific(query: string) {

    function extractJson(input) {
        // Regular expression to find JSON data enclosed within triple backticks
        const regex = /```json\s+([\s\S]*?)\s+```/;
        const match = input.match(regex);
        if (match && match[1]) {
            try {
                // Parse the JSON data
                const jsonData = JSON.parse(match[1]);
                return jsonData;
            } catch (e) {
                console.error("Failed to parse JSON:", e);
            }
        } else {
            console.error("No JSON data found");
        }
        return null;
    }

    try {
        let code_start = "```"
        let code_start_single = "`"
        let prompt = `<BOS_TOKEN><|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|># Safety Preamble
        The instructions in this section override those in the task description and style guide sections. Don't answer questions that are harmful or immoral.
        
        # System Preamble
        ## Basic Rules
        - You are a powerful tool Omega, an conversational AI trained by QXLABAI to help people. You are augmented by a number of tools, and your job is to use and consume the output of these tools to best help the user. You will see a conversation history between yourself and a user, ending with an utterance from the user. You will then see a specific instruction instructing you what kind of response to generate. When you answer the user's requests, you cite your sources in your answers, according to those instructions.
        - You can use multiple tools same time.
        ## Knowledge Cutoff Date
        - Current date and time: The current date and time is ${utcString}. You can convert it to other time zones as required. Remember that today's date is ${utcString} for any real-time event.
        - Knowledge cutoff: Your last known knowledge cutoff date is 1 October 2023. You will need to use other tools to gather information, events, and news beyond your knowledge cutoff date of 1 October 2023.
        - Remember that today's date is ${utcString} for any real-time event.

        # User Preamble
        ## Task and Context
        You help people answer their questions and other requests interactively. You will be asked a very wide array of requests on all kinds of topics. You will be equipped with a wide range of search engines or similar tools to help you, which you use to research your answer. You should focus on serving the user's needs as best you can, which will be wide-ranging.

        ## Style Guide
        Unless the user asks for a different style of answer, you should answer in full sentences, using proper grammar and spelling.

        ## Available Tools
        Here is a list of tools that you have available to you:

        ${code_start}python
        def directly_answer() -> List[Dict]:
            """Calls a standard (un-augmented) AI chatbot to generate a response given the conversation history
            """
            pass
            ${code_start}

        ${code_start}python
        def getTickers(ticker: string) -> List[Dict]:
            """Get a single market name and stock ticker if the user mentions a public company

            Args:
            ticker (string): The stock ticker symbol and market name, example NYSE:K or NASDAQ:AAPL
            """
            pass
            ${code_start}

        ${code_start}python
        def searchPlaces(query: string, location: string) -> List[Dict]:
            """ONLY SEARCH for places using the given query and location.

            Args:
            query (string): The search query for places
            location (string): The location to search for places
            """
            pass
            ${code_start}

        ${code_start}python
        def goShopping(query: string) -> List[Dict]:
            """Search for shopping items using the given query. It is useful when a user is discussing any product, brand, item, or object.

            Args:
            query (string): The search query for shopping items
            """
            pass
            ${code_start}<|END_OF_TURN_TOKEN|>`;

        prompt += `<|START_OF_TURN_TOKEN|><|USER_TOKEN|>${query}<|END_OF_TURN_TOKEN|>`;
        prompt += `<|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|>Write 'Action:' followed by a json-formatted list of actions that you want to perform in order to produce a good response to the user's last input. You can use any of the supplied tools any number of times, but you should aim to execute the minimum number of necessary actions for the input. You should use the ${code_start_single}directly_answer${code_start_single} tool if calling the other tools is unnecessary. The list of actions you want to call should be formatted as a list of json objects, for example:
        ${code_start}json
        [
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            },
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            }
        ]${code_start}<|END_OF_TURN_TOKEN|><|START_OF_TURN_TOKEN|><|CHATBOT_TOKEN|>`;

        const response = await cohere.generate({

            model: "command-r-plus",

            prompt: prompt,

            maxTokens: 2000,

            temperature: 0.3,

            k: 0,

            stopSequences: [],

            returnLikelihoods: "NONE"

        });

        const selected_tools = extractJson(response.generations[0].text);

        // console.log(`Selected Tools: ${JSON.stringify(selected_tools)}`);

        if (selected_tools[0]['tool_name'] != 'directly_answer') {
            const availableFunctions = {
                getTickers: getTickers,
                searchPlaces: searchPlaces,
                goShopping: goShopping,
                internet_search: internet_search,
            };

            for (const toolCall of selected_tools) {
                const functionName = toolCall.tool_name;
                const functionToCall = availableFunctions[functionName];
                const functionArgs = toolCall.parameters;
                let functionResponse;
                try {
                    if (functionName === 'getTickers') {
                        functionResponse = await functionToCall(functionArgs.ticker);
                    } else if (functionName === 'searchPlaces') {
                        functionResponse = await functionToCall(functionArgs.query, functionArgs.location);
                    } else if (functionName === 'goShopping') {
                        functionResponse = await functionToCall(functionArgs.query);
                    }
                    return JSON.parse(functionResponse);
                } catch (error) {
                    console.error(`Error calling function - (2) ${functionName}:`, error);
                    return JSON.stringify({ error: `Failed to call function ${functionName}` });
                }
            }
        }
    } catch (error) {
        console.error('Error in functionCalling:', error);
        return JSON.stringify({ error: 'An error occurred during function calling' });
    }
}

export async function functionCallingReference(query: string) {

    function extractJson(input) {
        // Regular expression to find JSON data enclosed within triple backticks
        const regex = /```json\s+([\s\S]*?)\s+```/;
        const match = input.match(regex);
        if (match && match[1]) {
            try {
                // Parse the JSON data
                const jsonData = JSON.parse(match[1]);
                return jsonData;
            } catch (e) {
                console.error("Failed to parse JSON:", e);
            }
        } else {
            console.error("No JSON data found");
        }
        return null;
    }

    try {
        let code_start = "```"
        let code_start_single = "`"
        let prompt = `<|begin_of_text|><|start_header_id|>SYSTEM<|end_header_id|>\n\n# Safety Preamble
        The instructions in this section override those in the task description and style guide sections. Don't answer questions that are harmful or immoral.

        # System Preamble
        ## Basic Rules
        - You are a powerful tool Omega, an conversational AI trained by QXLABAI to help people. You are augmented by a number of tools, and your job is to use and consume the output of these tools to best help the user. You will see a conversation history between yourself and a user, ending with an utterance from the user. You will then see a specific instruction instructing you what kind of response to generate. When you answer the user's requests, you cite your sources in your answers, according to those instructions.
        - Only use the selected tools when you find that these tools can help the user by providing better references in this situation. As these tools are very costly to run, we shouldn't waste our money when we actually don't need these tools. Otherwise, choose 'directly_answer'.
        - You can use multiple tools same time.

        ## Knowledge Cutoff Date
        - Current date and time: The current date and time is ${utcString}. You can convert it to other time zones as required. Remember that today's date is ${utcString} for any real-time event.
        - Knowledge cutoff: Your last known knowledge cutoff date is 1 October 2023. You will need to use other tools to gather information, events, and news beyond your knowledge cutoff date of 1 October 2023.
        - Remember that today's date is ${utcString} for any real-time event.

        # User Preamble
        ## Task and Context
        You help people answer their questions and other requests interactively. You will be asked a very wide array of requests on all kinds of topics. You will be equipped with a wide range of search engines or similar tools to help you, which you use to research your answer. You should focus on serving the user's needs as best you can, which will be wide-ranging.

        ## Style Guide
        Unless the user asks for a different style of answer, you should answer in full sentences, using proper grammar and spelling.

        ## Available Tools
        Here is a list of tools that you have available to you:

        ${code_start}python
        def directly_answer() -> List[Dict]:
            """Calls a standard (un-augmented) AI chatbot to generate a response given the conversation history
            """
            pass
            ${code_start}
        
        ${code_start}python
        def youtube_videos(query: string) -> List[Dict]:
            """Search for YouTube videos based on a user-provided query. This tool is helpful for finding videos relevant to specific topics, interests, or needs, such as "How can we make tea?" or "How to learn swimming." It is suitable for queries related to experiments, processes, and experiences. However, it should not be used for queries like "solve 2+2" or "write an essay on India.", etc.

            Args:
            query(string): The search query to find YouTube videos.
            """
            pass
            ${code_start}

        ${code_start}python
        def google_images(query: string) -> List[Dict]:
            """Search for images via Google Images based on a user-provided query. This is useful for obtaining visual content related to events, culture, or creative purposes. However, it is only suitable when you need an image as a reference and not suitable for demonstrating processes and learnings.

            Args:
            query(string): The search query to find images on Google Images.
            """
            pass
            ${code_start}
            
        ## Nest Steps:
        - Only use the selected tools when you find that these tools can help the user by providing better references in this situation. As these tools are very costly to run, we shouldn't waste our money when we actually don't need these tools. Otherwise, choose 'directly_answer'.
        - Write 'Action:' followed by a json-formatted list of actions that you want to perform in order to produce a good response to the user's last input. You can use any of the supplied tools any number of times, but you should aim to execute the minimum number of necessary actions for the input. You should use the ${code_start_single}directly_answer${code_start_single} tool if calling the other tools is unnecessary. The list of actions you want to call should be formatted as a list of json objects, for example:
        ${code_start}json
        [
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            },
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            }
        ]${code_start}
        <|eot_id|>`;

        prompt += `<|start_header_id|>USER<|end_header_id|>\n\n${query}<|eot_id|>`;
        prompt += `<|start_header_id|>ASSISTANT<|end_header_id|>\n\n`;

        const response = await cohere.generate({

            model: "command-r-plus",

            prompt: prompt,

            maxTokens: 2000,

            temperature: 0.3,

            k: 0,

            stopSequences: [],

            returnLikelihoods: "NONE"

        });

        const selected_tools = extractJson(response.generations[0].text);

        // console.log(`Selected Tools: ${JSON.stringify(selected_tools)}`);

        if (selected_tools[0]['tool_name'] != 'directly_answer') {
            return {
                type: selected_tools[0]['tool_name'],
                parameters: selected_tools[0].parameters
            };
        }
    } catch (error) {
        console.error('Error in functionCalling:', error);
        return JSON.stringify({ error: 'An error occurred during function calling' });
    }
}

export async function functionCallingFlow(query: string) {

    function extractJson(input) {
        // Regular expression to find JSON data enclosed within triple backticks
        const regex = /```json\s+([\s\S]*?)\s+```/;
        const match = input.match(regex);
        if (match && match[1]) {
            try {
                // Parse the JSON data
                const jsonData = JSON.parse(match[1]);
                return jsonData;
            } catch (e) {
                console.error("Failed to parse JSON:", e);
            }
        } else {
            console.error("No JSON data found");
        }
        return null;
    }

    try {
        // let tools = [
        //     {
        //         "name": "internet_search",
        //         "description": "Enables searching for any real-time information, any specific piece of information, any information after 2022, browsing the internet, retrieving data from Google, and finding facts, details, and information related to anything in the world based on a given prompt.",
        //         "parameter_definitions": {
        //             "query": {
        //                 "description": "Query to search the internet with",
        //                 "type": 'str',
        //                 "required": true
        //             }
        //         }
        //     },
        //     {
        //         'name': "directly_answer",
        //         "description": "Calls a standard (un-augmented) AI chatbot to generate a response given the conversation history",
        //         'parameter_definitions': {}
        //     },
        //     {
        //         "name": "code_solutions",
        //         "description": "It can provide any type of code solutions, whether related to real-time information or not. It can solve all types of coding problems under any condition, but it is only for coding solutions.",
        //         "parameter_definitions": {
        //             "languge": {
        //                 "description": "name of the programming language. by default - python",
        //                 "type": 'str',
        //                 "required": True
        //             }
        //         }
        //     },
        //     {
        //         "name": "math_solutions",
        //         "description": "It can provide solutions for any type of math-related problem. It can solve all kinds of math problems under any condition, but it is designed exclusively for math solutions.",
        //         "parameter_definitions": {
        //             "complexity": {
        //                 "description": "Define complexity of the math question. you can only choose from - [basic,intermediate,advanced,expert,master]",
        //                 "type": 'str',
        //                 "required": True
        //             }
        //         }
        //     },
        //     {
        //         "name": "generate_image",
        //         "description": "Generate an image based on a given prompt for general purposes, but not specialized in any specific category.",
        //         "parameter_definitions": {
        //             "prompt": {
        //                 "description": "The prompt for image generation",
        //                 "type": "string",
        //                 "required": true
        //             }
        //         }
        //     },
        //     {
        //         "name": "generate_human_image",
        //         "description": "Generate an image of human beings based on a given prompt. It is specialized in human image generation, focusing specifically on girls, boys, women, men, and children's images.",
        //         "parameter_definitions": {
        //             "prompt": {
        //                 "description": "The prompt for image generation",
        //                 "type": "string",
        //                 "required": true
        //             }
        //         }
        //     },
        //     {
        //         "name": "getTickers",
        //         "description": "Get a single market name and stock ticker if the user mentions a public company",
        //         "parameter_definitions": {
        //             "ticker": {
        //                 "description": "The stock ticker symbol and market name, example NYSE:K or NASDAQ:AAPL",
        //                 "type": "string",
        //                 "required": true
        //             }
        //         }
        //     },
        //     {
        //         "name": "searchPlaces",
        //         "description": "ONLY SEARCH for places using the given query and location",
        //         "parameter_definitions": {
        //             "query": {
        //                 "description": "The search query for places",
        //                 "type": "string",
        //                 "required": true
        //             },
        //             "location": {
        //                 "description": "The location to search for places",
        //                 "type": "string",
        //                 "required": true
        //             }
        //         }
        //     },
        //     {
        //         "name": "goShopping",
        //         "description": "Search for shopping items using the given query",
        //         "parameter_definitions": {
        //             "query": {
        //                 "description": "The search query for shopping items",
        //                 "type": "string",
        //                 "required": true
        //             }
        //         }
        //     }
        // ];

        let code_start = "```"
        let code_start_single = "`"
        let prompt = `<BOS_TOKEN><|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|># Safety Preamble
        The instructions in this section override those in the task description and style guide sections. Don't answer questions that are harmful or immoral.

        # System Preamble
        ## Basic Rules
        - You are a powerful tool Omega, an conversational AI trained by QXLABAI to help people. You are augmented by a number of tools, and your job is to use and consume the output of these tools to best help the user. You will see a conversation history between yourself and a user, ending with an utterance from the user. You will then see a specific instruction instructing you what kind of response to generate. When you answer the user's requests, you cite your sources in your answers, according to those instructions.
        - You can use multiple tools same time.

        ## Knowledge Cutoff Date
        - Current date and time: The current date and time is ${utcString}. You can convert it to other time zones as required. Remember that today's date is ${utcString} for any real-time event.
        - Knowledge cutoff: Your last known knowledge cutoff date is 1 October 2023. You will need to use other tools to gather information, events, and news beyond your knowledge cutoff date of 1 October 2023.
        - Remember that today's date is ${utcString} for any real-time event.

        # User Preamble
        ## Task and Context
        You help people answer their questions and other requests interactively. You will be asked a very wide array of requests on all kinds of topics. You will be equipped with a wide range of search engines or similar tools to help you, which you use to research your answer. You should focus on serving the user's needs as best you can, which will be wide-ranging.

        ## Style Guide
        Unless the user asks for a different style of answer, you should answer in full sentences, using proper grammar and spelling.

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
            """Calls a standard (un-augmented) AI chatbot to generate a response given the conversation history
            """
            pass
            ${code_start}

        ${code_start}python
        def code_solutions(languge: str) -> List[Dict]:
            """It can provide any type of code solutions, whether related to real-time information or not. It can solve all types of coding problems under any condition, but it is only for coding solutions.
        
            Args:
                languge (str): name of the programming language. by default - python
            """
            pass
            ${code_start}
        
        ${code_start}python
        def math_solutions(complexity: str) -> List[Dict]:
            """It can provide solutions for any type of math-related problem. It can solve all kinds of math problems under any condition, but it is designed exclusively for math solutions.
        
            Args:
                complexity (str): Define complexity of the math question. you can only choose from - [basic,intermediate,advanced,expert,master]
            """
            pass
        ${code_start}

        ${code_start}python
        def generate_image(prompt: string) -> List[Dict]:
            """Generate an image based on a given prompt for general purposes, but not specialized in any specific category.

            Args:
            prompt (string): The prompt for image generation
            """
            pass
            ${code_start}
        
        ${code_start}python
        def generate_human_image(prompt: string) -> List[Dict]:
            """Generate an image of human beings based on a given prompt. It is specialized in human image generation, focusing specifically on girls, boys, women, men, and children's images.

            Args:
            prompt (string): The prompt for image generation
            """
            pass
            ${code_start}

        ${code_start}python
        def searchPlaces(query: string, location: string) -> List[Dict]:
            """ONLY SEARCH for places using the given query and location

            Args:
            query (string): The search query for places
            location (string): The location to search for places
            """
            pass
            ${code_start}

        ${code_start}python
        def goShopping(query: string) -> List[Dict]:
            """Search for shopping items using the given query. It is useful when a user is discussing any product, brand, item, or object.

            Args:
            query (string): The search query for shopping items
            """
            pass
            ${code_start}<|END_OF_TURN_TOKEN|>`;

        prompt += `<|START_OF_TURN_TOKEN|><|USER_TOKEN|>${query}<|END_OF_TURN_TOKEN|>`;
        prompt += `<|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|>Write 'Action:' followed by a json-formatted list of actions that you want to perform in order to produce a good response to the user's last input. You can use any of the supplied tools any number of times, but you should aim to execute the minimum number of necessary actions for the input. You should use the ${code_start_single}directly_answer${code_start_single} tool if calling the other tools is unnecessary. The list of actions you want to call should be formatted as a list of json objects, for example:
        ${code_start}json
        [
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            },
            {
                "tool_name": title of the tool in the specification,
                "parameters": a dict of parameters to input into the tool as they are defined in the specs, or {} if it takes no parameters
            }
        ]${code_start}<|END_OF_TURN_TOKEN|><|START_OF_TURN_TOKEN|><|CHATBOT_TOKEN|>`;

        const response = await cohere.generate({

            model: "command-r-plus",

            prompt: prompt,

            maxTokens: 2000,

            temperature: 0.3,

            k: 0,

            stopSequences: [],

            returnLikelihoods: "NONE"

        });

        const selected_tools = extractJson(response.generations[0].text);

        if (selected_tools[0]['tool_name'] == 'code_solutions') {
            return {
                type: selected_tools[0]['tool_name'],
                parameters: selected_tools[0].parameters
            };
        } else if (selected_tools[0]['tool_name'] == 'math_solutions') {
            return {
                type: selected_tools[0]['tool_name'],
                parameters: selected_tools[0].parameters
            };
        } else if (selected_tools[0]['tool_name'] == 'news_search') {
            return {
                type: selected_tools[0]['tool_name'],
                parameters: selected_tools[0].parameters
            };
        } else if (selected_tools[0]['tool_name'] == 'generate_human_image') {
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
            const availableFunctions = {
                getTickers: getTickers,
                searchPlaces: searchPlaces,
                goShopping: goShopping,
                internet_search: internet_search,
                generate_image: generate_image,
                generate_human_image: generate_human_image,
            };

            for (const toolCall of selected_tools) {
                const functionName = toolCall.tool_name;
                const functionToCall = availableFunctions[functionName];
                const functionArgs = toolCall.parameters;
                let functionResponse;
                try {
                    if (functionName === 'searchPlaces') {
                        functionResponse = await functionToCall(functionArgs.query, functionArgs.location);
                    } else if (functionName === 'goShopping') {
                        functionResponse = await functionToCall(functionArgs.query);
                    } else if (functionName === 'internet_search') {
                        return {
                            type: 'internet_search',
                            parameters: functionArgs,
                        };
                    } else if (functionName === 'generate_image') {
                        functionResponse = await functionToCall(functionArgs.prompt);
                    } else if (functionName === 'generate_human_image') {
                        functionResponse = await functionToCall(functionArgs.prompt);
                    }

                    return JSON.parse(functionResponse);
                } catch (error) {
                    console.error(`Error calling function - (3) ${functionName}:`, error);
                    return JSON.stringify({ error: `Failed to call function ${functionName}` });
                }
            }
        } else {
            return {
                type: 'directly_answer'
            };
        }
    } catch (error) {
        console.error('Error in functionCalling:', error);
        return JSON.stringify({ error: 'An error occurred during function calling' });
    }
}