// 1. Import dependencies
import 'server-only';
import { createAI, createStreamableValue } from 'ai/rsc';
import { OpenAI } from 'openai';
import cheerio from 'cheerio';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document as DocumentInterface } from 'langchain/document';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { CohereClient } from "cohere-ai";
const cohere = new CohereClient({
  token: "pWTp76JUbHZ7b6zbbFteby3L6QsDcRc5Q25p0Omn",
});
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});
import { config } from './config';
import { functionCalling, functionCallingFlow, functionCallingSpecific, functionCallingReference } from './function-calling';
// 2. Determine which embeddings mode and which inference model to use based on the config.tsx. Currently suppport for OpenAI, Groq and partial support for Ollama embeddings and inference
let openai: OpenAI;
if (config.useOllamaInference) {
  openai = new OpenAI({
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama'
  });
} else {
  openai = new OpenAI({
    baseURL: config.nonOllamaBaseURL,
    apiKey: config.inferenceAPIKey
  });
}
// 2.5 Set up the embeddings model based on the config.tsx
let embeddings: OllamaEmbeddings | OpenAIEmbeddings;
if (config.useOllamaEmbeddings) {
  embeddings = new OllamaEmbeddings({
    model: config.embeddingsModel,
    baseUrl: "http://localhost:11434"
  });
} else {
  embeddings = new OpenAIEmbeddings({
    modelName: config.embeddingsModel
  });
}
// 3. Define interfaces for search results and content results
interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  favicon: string;
}
interface ContentResult extends SearchResult {
  html: string;
}
// 4. Fetch search results from Brave Search API
export async function getSources(message: string, numberOfPagesToScan = config.numberOfPagesToScan): Promise<SearchResult[]> {
  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(message)}&count=${numberOfPagesToScan}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY as string
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonResponse = await response.json();
    if (!jsonResponse.web || !jsonResponse.web.results) {
      throw new Error('Invalid API response format');
    }
    const final = jsonResponse.web.results.map((result: any): SearchResult => ({
      title: result.title,
      link: result.url,
      snippet: result.description,
      favicon: result.profile.img
    }));
    return final;
  } catch (error) {
    console.error('Error fetching search results:', error);
    throw error;
  }
}

export async function getSources2(query: string, freshness: string = ""): Promise<SearchResult[]> {
  if (freshness != "24h" && freshness != "7d" && freshness != "30d") {
    freshness = ""
  }
  try {
    const url = `${process.env.QXLABAPI_DOMAIN}/qx/search/alpha/v2`;
    const data = JSON.stringify({
      search: query,
      freshness: freshness
    });
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'authorization': process.env.QXLABAPI_KEY as string,
        'Content-Type': 'application/json'
      },
      body: data
    };

    try {
      const response = await fetch(url, requestOptions);
      if (!response.ok) {
        if (freshness == "24h") {
          freshness = "7d";
        } else if (freshness == "7d") {
          freshness = "30d";
        } else if (freshness == "30d") {
          freshness = "";
        } else {
          return [];
        }
        return getSources2(query, freshness);
        throw new Error(`Network response was not ok. Status: ${response.status}`);
      }

      const jsonResponse = await response.json();
      if (jsonResponse.status != 1) {
        return [];
      }

      const final = jsonResponse.data.map((result: any): SearchResult => ({
        title: result.title,
        link: result.url,
        snippet: result.description,
        favicon: `https://www.google.com/s2/favicons?domain=${result.url}&sz=256`
      }));
      return final;
    } catch (error) {
      return [];
      console.error('Error fetching search results:', error);
      throw error;
    }
  } catch (error) {
    return [];
    console.error('Error fetching search results:', error);
    throw error;
  }
}

// 5. Fetch contents of top 10 search results
export async function get10BlueLinksContents(sources: SearchResult[]): Promise<ContentResult[]> {
  async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 800): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (error) {
        console.log(`Skipping ${url}!`);
      }
      throw error;
    }
  }
  function extractMainContent(html: string): string {
    try {
      const $ = cheerio.load(html);
      $("script, style, head, nav, footer, iframe, img").remove();
      return $("body").text().replace(/\s+/g, " ").trim();
    } catch (error) {
      console.error('Error extracting main content:', error);
      throw error;
    }
  }
  const promises = sources.map(async (source): Promise<ContentResult | null> => {
    try {
      const response = await fetchWithTimeout(source.link, {}, 800);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${source.link}. Status: ${response.status}`);
      }
      const html = await response.text();
      const mainContent = extractMainContent(html);
      return { ...source, html: mainContent };
    } catch (error) {
      // console.error(`Error processing ${source.link}:`, error);
      return null;
    }
  });
  try {
    const results = await Promise.all(promises);
    return results.filter((source): source is ContentResult => source !== null);
  } catch (error) {
    console.error('Error fetching and processing blue links contents:', error);
    throw error;
  }
}

export async function get10BlueLinksContents2(sources: SearchResult[]): Promise<ContentResult[]> {
  async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 2000): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(`https://r.jina.ai/${url}`, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      console.log(`Used ---- ${url}`);
      return response;
    } catch (error) {
      if (error) {
        console.log(`Skipping ${url}`);
      }
      throw error;
    }
  }
  const promises = sources.map(async (source): Promise<ContentResult | null> => {
    try {
      const response = await fetchWithTimeout(source.link, {}, 800);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${source.link}. Status: ${response.status}`);
      }
      const text = await response.text();
      return { ...source, html: text };
    } catch (error) {
      console.error(`Error processing ${source.link}:`, error);
      return null;
    }
  });
  try {
    const results = await Promise.all(promises);
    return results.filter((source): source is ContentResult => source !== null);
  } catch (error) {
    console.error('Error fetching and processing blue links contents:', error);
    throw error;
  }
}

// 6. Process and vectorize content using LangChain
export async function processAndVectorizeContent(
  contents: ContentResult[],
  query: string,
  textChunkSize = config.textChunkSize,
  textChunkOverlap = config.textChunkOverlap,
  numberOfSimilarityResults = config.numberOfSimilarityResults,
): Promise<DocumentInterface[]> {
  try {
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      if (content.html.length > 0) {
        try {
          const splitText = await new RecursiveCharacterTextSplitter({ chunkSize: textChunkSize, chunkOverlap: textChunkOverlap }).splitText(content.html);
          const vectorStore = await MemoryVectorStore.fromTexts(splitText, { title: content.title, link: content.link }, embeddings);
          return await vectorStore.similaritySearch(query, numberOfSimilarityResults);
        } catch (error) {
          console.error(`Error processing content for ${content.link}:`, error);
        }
      }
    }
    return [];
  } catch (error) {
    console.error('Error processing and vectorizing content:', error);
    throw error;
  }
}
// 7. Fetch image search results from Brave Search API
export async function getImages(message: string): Promise<{ title: string; link: string }[]> {
  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/images/search?q=${message}&spellcheck=1`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY as string
      }
    });
    if (!response.ok) {
      throw new Error(`Network response was not ok. Status: ${response.status}`);
    }
    const data = await response.json();
    const validLinks = await Promise.all(
      data.results.map(async (result: any) => {
        const link = result.properties.url;
        if (typeof link === 'string') {
          try {
            const imageResponse = await fetch(link, { method: 'HEAD' });
            if (imageResponse.ok) {
              const contentType = imageResponse.headers.get('content-type');
              if (contentType && contentType.startsWith('image/')) {
                return {
                  title: result.properties.title,
                  link: link,
                };
              }
            }
          } catch (error) {
            console.error(`Error fetching image link ${link}:`, error);
          }
        }
        return null;
      })
    );
    const filteredLinks = validLinks.filter((link): link is { title: string; link: string } => link !== null);
    return filteredLinks.slice(0, 9);
  } catch (error) {
    console.error('There was a problem with your fetch operation:', error);
    throw error;
  }
}
// 8. Fetch video search results from Google Serper API
export async function getVideos(message: string): Promise<{ imageUrl: string, link: string }[] | null> {
  const url = 'https://google.serper.dev/videos';
  const data = JSON.stringify({
    "q": message
  });
  const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API as string,
      'Content-Type': 'application/json'
    },
    body: data
  };
  try {
    const response = await fetch(url, requestOptions);
    if (!response.ok) {
      throw new Error(`Network response was not ok. Status: ${response.status}`);
    }
    const responseData = await response.json();
    const validLinks = await Promise.all(
      responseData.videos.map(async (video: any) => {
        const imageUrl = video.imageUrl;
        if (typeof imageUrl === 'string') {
          try {
            const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
            if (imageResponse.ok) {
              const contentType = imageResponse.headers.get('content-type');
              if (contentType && contentType.startsWith('image/')) {
                return { imageUrl, link: video.link };
              }
            }
          } catch (error) {
            console.error(`Error fetching image link ${imageUrl}:`, error);
          }
        }
        return null;
      })
    );
    const filteredLinks = validLinks.filter((link): link is { imageUrl: string, link: string } => link !== null);
    return filteredLinks.slice(0, 9);
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw error;
  }
}
// 9. Generate follow-up questions using OpenAI API
const relevantQuestions = async (sources: SearchResult[], query = "The original search query or context"): Promise<any> => {
  console.log("sources ----- ", JSON.stringify(sources));
  console.log("query ----- ", JSON.stringify(query));
  const code_symbole = '```';
  const response = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `
          You are a Question generator who generates an array of 3 follow-up questions in JSON format.
          The JSON schema should include:
          ${code_symbole}json
          {
            "original": "${query}",
            "followUp": [
              "Question 1",
              "Question 2", 
              "Question 3"
            ]
          }
          ${code_symbole}
          `,
      },
      {
        role: "user",
        content: `Generate follow-up questions based on the top results from a similarity search: ${JSON.stringify(sources)}. The original search query is: "${query}".`,
      },
    ],
    model: config.inferenceModel,
    response_format: { type: "json_object" },
    max_tokens: 700,
    stop: ['<|eot_id|>']
  });

  console.log("response ----- ", JSON.stringify(response.choices[0].message.content));

  if (response.choices != null) {
    response.choices[0].message.content = extractJsonContent(response.choices[0].message.content);
  }
  return response;
};

const relevantImagePrompts = async (query): Promise<any> => {
  const code_symbole = '```';
  const response = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `
          You are a Image Prompt generator who generates an array of 3 image prompts in JSON format.
          The JSON schema should include:
          ${code_symbole}json
          {
            "original": "${query}",
            "followUp": [
              "prompt 1",
              "prompt 2", 
              "prompt 3"
            ]
          }
          ${code_symbole}
          `,
      },
      {
        role: "user",
        content: `Generate similer and simple prompts based on the original prompt. The original prompt is: "${query}".`,
      },
    ],
    model: config.inferenceModel,
    response_format: { type: "json_object" },
    max_tokens: 700,
    stop: ['<|eot_id|>']
  });

  console.log("response ----- ", JSON.stringify(response.choices[0].message.content));

  if (response.choices != null) {
    response.choices[0].message.content = extractJsonContent(response.choices[0].message.content);
  }
  return response;
};

export async function generate_image(prompt: string) {
  try {
    const output = await replicate.run(
      "ai-forever/kandinsky-2.2:424befb1eae6af8363edb846ae98a11111a39740988baebd279d73fe3ecc92c2",
      {
        input: {
          width: 1024,
          height: 1024,
          prompt: prompt,
          num_outputs: 4,
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
        },
        {
          "prompt": prompt,
          "index": 3,
          "image": output[2]
        },
        {
          "prompt": prompt,
          "index": 4,
          "image": output[3]
        }
      ]
    };
    return normalizedData;
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
          num_outputs: 4,
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
        {
          "prompt": prompt,
          "index": 3,
          "image": output[2]
        },
        {
          "prompt": prompt,
          "index": 4,
          "image": output[3]
        }
      ]
    };
    return normalizedData;
  } catch (error) {
    console.error('Error searching for generate_human_image:', error);
    return JSON.stringify({ error: 'Failed to generate human image' });
  }
}

const extractJsonContent = (text: string) => {

  let regex;

  // Check each case to determine the appropriate regex
  if (text.includes('```json\n')) {
    regex = /```json\n([\s\S]*?)```/;
  } else if (text.includes('```json')) {
    regex = /```json([\s\S]*?)```/;
  } else if (text.includes('```\n')) {
    regex = /```\n([\s\S]*?)```/;
  } else if (text.includes('```')) {
    regex = /```([\s\S]*?)```/;
  } else {
    // If none of the conditions are met, return an empty string
    return '';
  }

  // Match the JSON data using the selected regex
  const matches = text.match(regex);
  if (matches && matches[1]) {
    // Parse the JSON string inside the matches
    try {
      const jsonObj = JSON.parse(matches[1].trim());
      return jsonObj;
    } catch (error) {
      return null;
    }
  } else {
    return null;
  }
};

// 10. Main action function that orchestrates the entire process
async function myAction(userMessage: string): Promise<any> {
  "use server";
  const streamable = createStreamableValue({});
  const now = new Date();
  // Convert the date to a UTC string
  const utcString = now.toUTCString();

  let llm_stream = true;

  (async () => {
    // const images = getImages(userMessage),
    // videos videos = getVideos(userMessage),
    const [functionCallingReferenceCall, functionCallingSpecificCall, functionCallingFlowCall] = await Promise.all([
      functionCallingReference(userMessage),
      functionCallingSpecific(userMessage),
      functionCallingFlow(userMessage),
    ]);

    // streamable.update({ 'images': images });
    // streamable.update({ 'videos': videos });
    if (config.useFunctionCalling) {
      streamable.update({ 'conditionalFunctionCallUI': functionCallingSpecificCall });
    }

    let custom_model_id = config.inferenceModel;
    let followUp;
    let sources;
    let llm_preamble = `# System Preamble

    ## Basic Rules
    You are an AI Assistant called Omega, developed by QXLABAI.
    Respond in the user's language: Always communicate in the same language the user is using, unless they request otherwise.
    Current date and time: The current date and time is ${utcString}. You can convert it to other time zones as required.
    Knowledge cutoff: Your knowledge is limited to information available up to 1 October 2023. Do not provide information or claim knowledge beyond this date.
    Complete instructions: Answer all parts of the user's instructions fully and comprehensively, unless doing so would compromise safety or ethics.
    Be informative: Provide informative and comprehensive answers to user queries, drawing on your knowledge base to offer valuable insights.

    # User Preamble

    ## Style Guide
    Unless the user asks for a different style of answer, you should answer in full sentences, using proper grammar and spelling.
    Complexity analysis: When a query is complex or related to code and math, try to solve it step by step. However, when the task is simple, you can solve it normally.
    Math related solutions: If query is realted to math. First solve it then provide the correct answer.
  `;
    let llmMessage = [];
    let gen_images;

    if (functionCallingFlowCall != null && functionCallingFlowCall != undefined) {
      if (functionCallingFlowCall.type == 'generate_image' || functionCallingFlowCall.type == 'generate_human_image') {
        streamable.update({ 'omega_art': ['loading']});

        // if (functionCallingReferenceCall != null && functionCallingReferenceCall != undefined) {
        //   if (functionCallingReferenceCall.type == 'google_images') {
        //     streamable.update({ 'images': ['loading'] });
        //   }
        // }

        if (functionCallingFlowCall.type == 'generate_human_image') {
          gen_images = await generate_human_image(functionCallingFlowCall.parameters.prompt);
        } else {
          gen_images = await generate_image(functionCallingFlowCall.parameters.prompt);
        }

        let omage_arts = [];

        for (const item of gen_images.images) {
          omage_arts.push({
            prompt: functionCallingFlowCall.parameters.prompt,
            image: item.image
          });
        }

        streamable.update({ 'omega_art': omage_arts});

        // if (functionCallingReferenceCall != null && functionCallingReferenceCall != undefined) {
        //   if (functionCallingReferenceCall.type == 'google_images') {

        //     streamable.update({ 'images': ['loading'] });
        //     (async () => {
        //       const images = await getImages(functionCallingReferenceCall.parameters.query);
        //       streamable.update({ 'images': images });
        //     })();
        //   }
        // }
        // llm_preamble = `You are an AI Assistant named Omega, developed by QXLABAI. Users can request image generation using a prompt. You are very very capable in image generation and you always genrated high quality and accuracy. Here are the generated image links for that prompt: ${JSON.stringify(gen_images.images)}. As requested, we generated an image for that prompt, Please use above genrated images only. Your answer should be formatted in Markdown only so you can image links to display the images. respond in markdown using for example - ![alt text](${gen_images.images[0].image}) \n\n 2nd variations - ![alt text](${gen_images.images[1].image}), etc.`;

        // llmMessage.push({
        //   role: "system", content: llm_preamble
        // });

        // llmMessage.push({
        //   role: "user", content: `Respond in ![alt text](URL) markdown format, Generate images for: ${userMessage}`
        // });

        custom_model_id = 'omega_art';
        llm_stream = false;
      } else if (functionCallingFlowCall.type == 'directly_answer') {
        llmMessage.push({
          role: "system", content: `You are an AI Assistant named Omega, developed by QXLABAI.`
        });

        llmMessage.push({
          role: "user", content: userMessage
        });

      } else if (functionCallingFlowCall.type == 'news_search') {
        sources = await getSources2(`News: ${functionCallingFlowCall.parameters.query}`, functionCallingFlowCall.parameters.freshness);
        streamable.update({ 'searchResults': sources });

        // const html = await get10BlueLinksContents2(sources);
        // const vectorResults = await processAndVectorizeContent(html, userMessage);
        // console.log("vectorResults - ", vectorResults);
        llm_preamble = `# System Preamble
  
        ## Basic Rules
        You are an AI Assistant called Omega, developed by QXLABAI. You have access to all real-time data, such as news, events, stock prices, and internet data.
        - Current date and time: The current date and time is ${utcString}. You don't have a knowledge cutoff date since you have access to all real-time events via the internet.

        ## News Items:\n\n`;

        for (let i = 0; i < sources.length; i++) {
          llm_preamble += `- News Title: "${sources[i].title}"\n - News URL: "${sources[i].link}" \n - News Content: ${sources[i].snippet} \n\n `;
          if (i >= 10) {
            break
          }
        }

        llm_preamble += `
        ## Next Steps
        - Carefully read the News Items - Before responding to the user, first carefully read the News Items related to numbers, dates, amounts, currency, symbols, and other sensitive information so you can provide accurate data to the user.
        - Write the above news in newspaper style. Try to write in an engaging style so users can understand it easily.
        - Please provide links along with the news articles so users can refer to the original sources. You can use Markdown format for that.
        - Only provide news articles that are useful and meaningful to the user, skipping the rest.
        `;

        llmMessage.push(
          { role: "system", content: llm_preamble },
        );

        llmMessage.push(
          { role: "user", content: userMessage },
        );

        // custom_model_id = 'omega_1_4';
      } else if (functionCallingFlowCall.type == 'internet_search') {
        sources = await getSources2(functionCallingFlowCall.parameters.query, functionCallingFlowCall.parameters.freshness);
        streamable.update({ 'searchResults': sources });
        // console.log("sources --- ", JSON.stringify(sources));
        // const html = await get10BlueLinksContents(sources);
        // console.log("html --- ", JSON.stringify(html));
        // const vectorResults = await processAndVectorizeContent(html, userMessage);

        // let html;
        // let vectorResults;

        // html = await get10BlueLinksContents2(sources);
        // if(html.length == 0){
        //   vectorResults = [];
        //   vectorResults.
        // }


        llm_preamble = `# System Preamble
  
        ## Basic Rules
        - You are an AI Assistant called Omega, developed by QXLABAI. You have access to all real-time data, such as news, events, stock prices, and internet data.
        - Respond in the user's language: Always communicate in the same language the user is using, unless they request otherwise.
        - Current date and time: The current date and time is ${utcString}. You can convert it to other time zones as required. Remember that today's date is ${utcString} for any real-time event.
        - Knowledge cutoff: You have internet access so you can access all real-time event, news, etc.
        - Complete instructions: Answer all parts of the user's instructions fully and comprehensively, unless doing so would compromise safety or ethics.
        - Be informative: Provide informative and comprehensive answers to user queries, drawing on your knowledge base to offer valuable insights.
        - Your answer should be clear, accurate, on the point and provide a meaningful response to the question.

        # Context Preamble
  
        ## Internet Data:\n\n`;

        for (let i = 0; i < sources.length; i++) {
          llm_preamble += `- Title: "${sources[i].title}"\n - URL: "${sources[i].link}" \n - Content: ${sources[i].snippet} \n\n `;
          if (i >= 10) {
            break
          }
        }

        llm_preamble += `
        ## Next Steps
        - We will provide Internet Data to help you give accurate and better responses to user queries.
        - You can use the Internet Data as part of your internal knowledge when required to answer the user's questions.
        - You can also apply custom logic to the provided Internet Data or your knowledge to provide the correct answer.
        - Try to help the user as much as you can by providing correct, informative, and engaging answers.
        - Carefully read the Internet Data - Before responding to the user, first carefully read the Internet Data related to numbers, dates, amounts, currency, symbols, and other sensitive information so you can provide accurate data to the user.
        - Only use important, meaningful data from the provided 'Internet Data'. You can leave other useless data.
        - Please provide links along with the details, data, events, references, and items so users can refer to the original sources.
        - Use Markdown format to provide URLs to the source.
        - Provide the source link immediately after the line where the data is used for reference.
        - You can provide references multiple times where the data is used to answer the user's query.
        - Use the following format to provide URLs: [Source Name](https://www.example.com), [Website Name](https://www.example.com), [Website Name](https://www.example.com), [Visit here](https://www.example.com), [Read here](https://www.example.com), [Reference](https://www.example.com), [source](https://www.example.com), [Read more](https://www.example.com), etc.
        `;

        // llm_preamble = `## Basic Rules
        // - You are an AI Assistant called Omega, developed by QXLABAI.
        // - Current date and time: The current date and time is ${utcString}. You can convert it to other time zones as required.
        // - Knowledge cutoff: You have internet access so you can access all real-time event, news, etc.

        // ## Internet Data:
        // - ${JSON.stringify(vectorResults)}

        // ## Internet Data End ##

        // ## Next Steps
        // - We will provide Internet Data as Addisonian knowledge to help you give accurate and better responses to user queries.
        // - You can use the Internet Data as part of your internal knowledge when required to answer the user's questions.
        // - You can also apply custom logic to the provided Internet Data or your knowledge to provide the correct answer.
        // - Try to help the user as much as you can by providing correct, informative, and engaging answers.
        // - Please provide a helpful and informative answer that is well-structured without mentioning unnecessary things.
        // `;

        llmMessage.push(
          { role: "system", content: llm_preamble },
        );

        llmMessage.push(
          { role: "user", content: userMessage },
        );

        // custom_model_id = 'omega_1_4';
      } else if (functionCallingFlowCall.type == 'code_solutions') {

        llm_preamble = `# System Preamble
  
        ## Basic Rules
        You are an AI Assistant called Omega, developed by QXLABAI. You are an expert in coding. Try to help users solve coding-related queries.
        Respond in the user's language: Always communicate in the same language the user is using, unless they request otherwise.
        Current date and time: The current date and time is ${utcString}. You can convert it to other time zones as required.
        Knowledge cutoff: Your knowledge is limited to information available up to 1 October 2023. Do not provide information or claim knowledge beyond this date.
        Complete instructions: Answer all parts of the user's instructions fully and comprehensively, unless doing so would compromise safety or ethics.
        Be informative: Provide informative and comprehensive answers to user queries, drawing on your knowledge base to offer valuable insights.
        `;
        llmMessage.push(
          {
            role: "user", content: userMessage
          }
        );

        custom_model_id = 'omega_1_4';
      } else if (functionCallingFlowCall.type == 'math_solutions') {
        llmMessage.push(
          {
            role: "system", content: `You are an AI Assistant called Omega, developed by QXLABAI. You are an expert in mathematics, problem-solving, and reasoning. Try to help users solve math-related queries.
            
            ## Next Steps
            Complexity analysis: When a query is complex or related to code and math, try to solve it step by step. However, when the task is simple, you can solve it normally.
            Math related solutions: If query is realted to math. First solve it then provide the correct answer.
            `
          }
        );
        llmMessage.push(
          {
            role: "user", content: userMessage
          }
        );
      } else {
        llmMessage.push({
          role: "user", content: userMessage
        });

        // custom_model_id = 'omega_1_4';
      }
    } else {
      llmMessage.push({
        role: "user", content: userMessage
      });

      // custom_model_id = 'omega_1_4';
    }

    if (functionCallingReferenceCall != null && functionCallingReferenceCall != undefined) {
      if (functionCallingReferenceCall.type == 'youtube_videos') {
        streamable.update({ 'videos': ['loading'] });
        (async () => {
          const videos = await getVideos(functionCallingReferenceCall.parameters.query);
          streamable.update({ 'videos': videos });
        })();
      }
      // if (functionCallingReferenceCall.type == 'google_images' && custom_model_id != 'omega_art') {
      //   streamable.update({ 'images': ['loading'] });
      //   (async () => {
      //     const images = await getImages(functionCallingReferenceCall.parameters.query);
      //     streamable.update({ 'images': images });
      //   })();
      // }
    }

    if (custom_model_id == 'omega_art') {
      let code_symbol = '`';
      streamable.update({ 'llmResponse': `I hope you liked the generated images for your prompt: ${code_symbol}${functionCallingFlowCall.parameters.prompt}${code_symbol}\n\nWould you like an image generated for anything else? Please let me know.` });
      streamable.update({ 'llmResponseEnd': true });
      followUp = await relevantImagePrompts(userMessage);
      streamable.update({ 'followUp': followUp });
    } else if (custom_model_id == 'omega_1_4') {
      const stream = await cohere.chatStream({
        model: "command-r-plus",
        preamble: llm_preamble,
        message: userMessage,
      });

      for await (const chat of stream) {
        if (chat.eventType === "text-generation") {
          streamable.update({ 'llmResponse': chat.text });
        } else if (chat.eventType === 'stream-end') {
          streamable.update({ 'llmResponseEnd': true });
        }
      }
    } else {

      const eos_token_2 = '<|eot_id|>';
      const chatCompletion = await openai.chat.completions.create({
        messages: llmMessage,
        stream: llm_stream,
        model: config.inferenceModel,
        max_tokens: 2048,
        stop: [eos_token_2]
      });

      if (llm_stream == false) {
        streamable.update({ 'llmResponse': chatCompletion.choices[0].message.content });
        followUp = await relevantQuestions([chatCompletion.choices[0].message.content], userMessage);
        streamable.update({ 'followUp': followUp });
        streamable.update({ 'llmResponseEnd': true });
      } else {
        let assistant_message = "";
        for await (const chunk of chatCompletion) {
          if (chunk.choices[0].delta && chunk.choices[0].finish_reason !== "stop") {
            if (chunk.choices[0].delta.content != eos_token_2) {
              streamable.update({ 'llmResponse': chunk.choices[0].delta.content });
              assistant_message += chunk.choices[0].delta.content
            } else {
              if (!config.useOllamaInference) {
                if (functionCallingFlowCall != null && functionCallingFlowCall != undefined) {
                  if (functionCallingFlowCall.type != 'internet_search') {
                    followUp = await relevantQuestions([assistant_message], userMessage);
                    streamable.update({ 'followUp': followUp });
                  }
                }
              }
            }
          } else if (chunk.choices[0].finish_reason != null) {
            streamable.update({ 'llmResponseEnd': true });
          }
        }
      }
    }
    if (!config.useOllamaInference) {
      if (functionCallingFlowCall != null && functionCallingFlowCall != undefined) {
        if (functionCallingFlowCall.type == 'internet_search') {
          followUp = await relevantQuestions(sources, userMessage);
          streamable.update({ 'followUp': followUp });
        }
      }
    }
    streamable.done({ status: 'done' });
  })();
  return streamable.value;
}
// 11. Define initial AI and UI states
const initialAIState: {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  id?: string;
  name?: string;
}[] = [];
const initialUIState: {
  id: number;
  display: React.ReactNode;
}[] = [];
// 12. Export the AI instance
export const AI = createAI({
  actions: {
    myAction
  },
  initialUIState,
  initialAIState,
});
