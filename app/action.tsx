import 'server-only';
import { createAI, createStreamableValue } from 'ai/rsc';
import { OpenAI } from 'openai';
import axios from "axios";

const axios_instance = axios.create({});

const delay = (ms: any) => new Promise((resolve) => setTimeout(resolve, ms));

import { config } from './config';
import { functionCallingFlow, functionCallingSpecific, functionCallingReference } from './function-calling';

const client = new OpenAI({
  baseURL: config.llmBaseUrl,
  apiKey: config.inferenceAPIKey
});

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


export async function getSources2(query: string, freshness: string = ""): Promise<SearchResult[]> {
  if (freshness != "24h" && freshness != "7d" && freshness != "30d") {
    freshness = ""
  }
  try {
    const url = `${process.env.US_API_DOMAIN}/qx/search/alpha/v2`;
    const data = JSON.stringify({
      search: query,
      freshness: freshness
    });
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'authorization': process.env.US_API_KEY as string,
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
    }
  } catch (error) {
    return [];
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
            // console.error(`Error fetching image link ${imageUrl}:`, error);
          }
        }
        return null;
      })
    );
    const filteredLinks = validLinks.filter((link): link is { imageUrl: string, link: string } => link !== null);
    return filteredLinks.slice(0, 9);
  } catch (error) {
    // console.error('Error fetching videos:', error);
    throw error;
  }
}
// 9. Generate follow-up questions using OpenAI API
const relevantQuestions = async (sources: SearchResult[], query = "The original search query or context"): Promise<any> => {
  const code_symbole = '```';
  const response = await client.chat.completions.create({
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
    // response_format: { type: "json_object" },
    max_tokens: 1600
  });

  if (response.choices != null) {
    response.choices[0].message.content = extractJsonContent(response.choices[0].message.content || "");
  }
  return response;
};

const relevantImagePrompts = async (query: string): Promise<any> => {
  const code_symbole = '```';
  const response = await client.chat.completions.create({
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
          Your prompts should start from Generate image, Craft, Design, Draw, Skatch, Render painting, etc. or use can use anythingelse related to provided conditions, Senario and images.
          `,
      },
      {
        role: "user",
        content: `Generate similer and simple prompts based on the original prompt. The original prompt is: "${query}".`,
      },
    ],
    model: config.inferenceModel,
    max_tokens: 1600
  });

  if (response.choices != null) {
    response.choices[0].message.content = extractJsonContent(response.choices[0].message.content || "");
  }
  return response;
};

export async function generate_image(prompt: string) {
  const url = `${process.env.US_API_DOMAIN}/omega/private/picasso/v1/images/generations`;
  const apiKey = process.env.US_API_KEY;
  const data = {
    prompt: prompt,
    // negative_prompt: "(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation, NSFW",
    steps: 20,
    n: 4,
    size: "1024x768",
    guidance_scale: 3
  };

  try {
    const response = await axios_instance.post(url, data, {
      headers: {
        'accept': 'application/json',
        'authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const responseData = response.data;

    if (responseData.status === 1) {
      await delay(1000);
      const normalizedData = {
        type: 'generate_human_image',
        images: [
          {
            "prompt": prompt,
            "index": 1,
            "image": responseData.data[0].url,
          },
          {
            "prompt": prompt,
            "index": 2,
            "image": responseData.data.length > 1 ? responseData.data[1].url : responseData.data[0].url,
          },
          {
            "prompt": prompt,
            "index": 3,
            "image": responseData.data.length > 2 ? responseData.data[2].url : responseData.data[0].url,
          },
          {
            "prompt": prompt,
            "index": 4,
            "image": responseData.data.length > 3 ? responseData.data[3].url : responseData.data[0].url,
          }
        ]
      };
      return normalizedData;
    } else {
      // console.error('Error generating image:', responseData.message);
    }
  } catch (error) {
    // if (error.response) {
    //   // console.error('Error response status:', error.response.status);
    // } else if (error.request) {
    //   // console.error('No response received:', error.request);
    // } else {
    //   // console.error('Error setting up the request:', error.message);
    // }
  }
}

const extractJsonContent = (text: string) => {

  let regex;
  if (text.includes('```json\n')) {
    regex = /```json\n([\s\S]*?)```/;
  } else if (text.includes('```json')) {
    regex = /```json([\s\S]*?)```/;
  } else if (text.includes('```\n')) {
    regex = /```\n([\s\S]*?)```/;
  } else if (text.includes('```')) {
    regex = /```([\s\S]*?)```/;
  } else {
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
async function myAction(userMessage: string, history: any): Promise<any> {
  "use server";

  let tmpHistroy = [];
  for (let i = 0; i < history.length; i++) {
    tmpHistroy.push({
      role: "user",
      content: history[i].userMessage
    });
    if (history[i].omega_art && history[i].omega_art.length > 0) {
      let imageArt = `Prompt: ${history[i].content} \n\n `;
      for (let j = 0; j < history[i].omega_art.length; j++) {
        if (j == 0) {
          imageArt += "Images Links: \n\n ";
        }
        imageArt += `${j + 1}. ${history[i].omega_art[j].image} \n\n `;
      }
      tmpHistroy.push({
        role: "assistant",
        content: imageArt
      });
    } else {
      tmpHistroy.push({
        role: "assistant",
        content: history[i].content
      });
    }
  }

  if (tmpHistroy.length > 4) {
    tmpHistroy.slice(-4);
  }

  const streamable = createStreamableValue({});
  const now = new Date();
  // Convert the date to a UTC string
  const utcString = now.toUTCString();

  let llm_stream = true;

  (async () => {
    const [functionCallingReferenceCall, functionCallingSpecificCall, functionCallingFlowCall] = await Promise.all([
      functionCallingReference(userMessage, tmpHistroy),
      functionCallingSpecific(userMessage, tmpHistroy),
      functionCallingFlow(userMessage, tmpHistroy),
    ]);

    let extra_context = "";
    if (functionCallingSpecificCall && functionCallingSpecificCall.length > 0) {
      for (const item of functionCallingSpecificCall) {
        if (item.type == "shopping") {
          let tmp_data = "Shoping Data:\n\n "
          let index = 0;
          for (const item_2 of item.shopping) {
            index += 1;
            tmp_data += `Item ID: ${index} \n Title: ${item_2.title} \n Source: ${item_2.source} \n Product Buy Link: ${item_2.link} \n Price: ${item_2.price} \n Rating: ${item_2.rating} \n\n `
          }
          extra_context += `${tmp_data}\n\n\n`;
        } else if (item.type == "places") {
          let tmp_data = "Location Data:\n\n "
          let index = 0;
          for (const item_2 of item.places) {
            index += 1;
            tmp_data += `Location ID: ${index} \n Title: ${item_2.title} \n Address: ${item_2.address} \n Rating: ${item_2.rating} \n PhoneNumber: ${item_2.phoneNumber} \n Website: ${item_2.website} \n\n `
          }

          extra_context += `${tmp_data}\n\n\n`;
        }
      }
    }

    if (config.useFunctionCalling) {
      streamable.update({ 'conditionalFunctionCallUI': functionCallingSpecificCall });
    }

    let custom_model_id = config.inferenceModel;
    let followUp;
    let sources;
    let llm_preamble = `You are 'Executable UltraSafe AI', an AI Assistant exclusively developed, trained and powered by the scientists and engineers at UltraSafe AI. UltraSafe AI, based in United States of America (USA), specializes in developing and integrating AI technologies to enhance business operations across various industries. You are built on the unique Omega architecture and trained with extensive datasets and configurations. You were developed solely by the scientists and engineers at UltraSafe AI, without any external assistance from other organizations or teams.
    
    Operational Details:
    - Current Date and Time (UTC Timezone): ${utcString}.  Convert to other time zones as needed.
    - Knowledge Cutoff Date: Omega possesses comprehensive knowledge up to January 2024, ensuring a robust foundational understanding across a wide range of topics.
    - Real-Time Data Access: Despite the base knowledge cutoff, Omega has the capability to access real-time data about past, present, and future events and specifics through internet searches. This enables Omega to provide accurate, up-to-date answers and predictive insights, effectively eliminating the limitations of a traditional knowledge cutoff date.
    
    Response Protocols:
    1. Creativity and Detail: Responses should be comprehensive, well-structured, point-to-point, professional, and detailed, aiding users effectively by addressing their queries thoroughly.
    2. Instruction Adherence: Responses must adhere closely to user instructions, ensuring that each answer aligns with specific user requirements.
    3. Presentation and Formatting: You can utilize Markdown or LaTeX (for Math) for structured and visually appealing responses. Include titles, headings, subheadings, lists, quotes, pointers, bold, italic text, etc., and emphasize where appropriate to enhance readability and engagement.
    4. Tone and Interaction Style: Maintain a professional yet conversational tone. Adjust the style to match the context of the query while being friendly and informative.
    5. Enhanced Engagement: Where applicable, enrich responses with tips, suggestions, alternatives, explanations, tricks, cautions, instructions, notes, methods, options, equipment, ingredients, features, predictions, and recommendations to provide added value and insight.
    
    Human Interaction Enhancements:
    - Human-like Talk: Engage in dialogue that mirrors natural human conversation to create a more personable and relatable interaction.
    - Avoid Robotic Phrases: Steer clear of generic or robotic expressions. Instead, use phrases and responses that reflect genuine human interaction. Examples to avoid include: 'I hope this email finds you well', 'Kindly be advised', 'Please do not hesitate to contact me', 'Hope this message finds you well', etc.
    - Emoji Usage: Employ emojis to make conversations more personal and engaging, but only when appropriate based on the situation, question, or context of the interaction.
    - Engaging Start: Initiate conversations with either a chatty, professional, or formal style, depending on the context, to better connect with users emotionally and enhance the engagement quality of the conversation.
    
    Formatting Guidelines:
    - Use clear, concise language with a focus on delivering informative and actionable advice.
    - Employ a structured approach to present information logically and engagingly.`;

    if (extra_context != "") {
      llm_preamble += ` \n\n ------ \n\n How to Use Sourced Information:

      - Analytical Application: Use sourced information and apply custom logic to derive accurate answers. Often, integrating multiple data points from sourced information is necessary to fully address a query.
      - Data Analysis: Before responding, understand the question's requirements thoroughly, then use the available sourced information and your analytical skills to answer.
      - Accuracy in Details: Pay close attention to numbers, amounts, currencies, values, names, and relationships between entities to avoid errors and provide correct answers.
      - Maximize Assistance: Utilize your analytical abilities, logic, existing content, chat history, and mathematical skills to assist the user as effectively as possible.
      - Handling Data Gaps: If relevant and required information is unavailable, honestly communicate the limitation: 'Although I have internet access, I'm currently unable to find information related to your query. Despite the vastness of the internet and advanced search mechanisms, locating specific information can sometimes be challenging. I aim to provide accurate information and would not want to share incorrect details. It's unusual, but it does happen occasionally. I know it's strange, but this is the truth of life.'
      - Source Citation: Provide citations immediately following the content where sourced information as Hyper-links. Use clear annotations with links so users can verify the information themselves. For example: [Page Title](source url), [Website Name](https://www.example.com), [Visit here](https://www.example.com), [Read here](https://www.example.com), [Watch Now](https://www.example.com), [Buy Now](https://www.example.com), etc.
      - Always provide detailed and long answer.

      \n\n ------ \n\n
      Sourced Information:
      ${extra_context}
      `
    }

    let llmMessage = [];
    let gen_images;

    if (functionCallingFlowCall && typeof functionCallingFlowCall === 'object' && 'type' in functionCallingFlowCall) {
      if (functionCallingFlowCall.type === 'generate_image') {
        streamable.update({ 'omega_art': ['loading'] });
    
        gen_images = await generate_image(functionCallingFlowCall.parameters.prompt);
    
        let omage_arts = [];
    
        for (const item of gen_images.images) {
          omage_arts.push({
            prompt: functionCallingFlowCall.parameters.prompt,
            image: item.image
          });
        }
    
        streamable.update({ 'omega_art': omage_arts });
    
        custom_model_id = 'omega_art';
        llm_stream = false;
      } else if (functionCallingFlowCall.type === 'directly_answer') {
        llmMessage.push({
          role: "system", content: llm_preamble
        });
    
        if (tmpHistroy.length > 0) {
          for (let i = 0; i < tmpHistroy.length; i++) {
            llmMessage.push(tmpHistroy[i]);
          }
        }
    
        llmMessage.push({
          role: "user", content: userMessage
        });
      } else if (functionCallingFlowCall.type === 'news_search') {
        sources = await getSources2(`News: ${functionCallingFlowCall.parameters.query}`, functionCallingFlowCall.parameters.freshness);
        streamable.update({ 'searchResults': sources });
    
        let searchResultData = "";
        for (let i = 0; i < 4; i++) {
          searchResultData += `\n\n ${i + 1}: \n Title: ${sources[i].title} \n Source: ${sources[i].link} \n Description: ${sources[i].snippet} \n\n `;
          if (i >= 10) {
            break;
          }
        }

        llm_preamble = `You are 'Executable UltraSafe AI', an AI Assistant exclusively developed, trained and powered by the scientists and engineers at UltraSafe AI. UltraSafe AI, based in United States of America (USA), specializes in developing and integrating AI technologies to enhance business operations across various industries. You are built on the unique Omega architecture and trained with extensive datasets and configurations. You were developed solely by the scientists and engineers at UltraSafe AI, without any external assistance from other organizations or teams.
        
        Operational Details:
        - Current Date and Time (UTC Timezone): ${utcString}.  Convert to other time zones as needed.
        - Knowledge Cutoff Date: Omega possesses comprehensive knowledge up to January 2024, ensuring a robust foundational understanding across a wide range of topics.
        - Real-Time Data Access: Despite the base knowledge cutoff, Omega has the capability to access real-time data about past, present, and future events and specifics through internet searches. This enables Omega to provide accurate, up-to-date answers and predictive insights, effectively eliminating the limitations of a traditional knowledge cutoff date.
        
        Response Protocols:
        1. Creativity and Detail: Responses should be comprehensive, well-structured, point-to-point, professional, and detailed, aiding users effectively by addressing their queries thoroughly.
        2. Instruction Adherence: Responses must adhere closely to user instructions, ensuring that each answer aligns with specific user requirements.
        3. Presentation and Formatting: You can utilize Markdown or LaTeX (for Math) for structured and visually appealing responses. Include titles, headings, subheadings, lists, quotes, pointers, bold, italic text, etc., and emphasize where appropriate to enhance readability and engagement.
        4. Tone and Interaction Style: Maintain a professional yet conversational tone. Adjust the style to match the context of the query while being friendly and informative.
        5. Enhanced Engagement: Where applicable, enrich responses with tips, suggestions, alternatives, explanations, tricks, cautions, instructions, notes, methods, options, equipment, ingredients, features, predictions, and recommendations to provide added value and insight.
        
        Human Interaction Enhancements:
        - Human-like Talk: Engage in dialogue that mirrors natural human conversation to create a more personable and relatable interaction.
        - Avoid Robotic Phrases: Steer clear of generic or robotic expressions. Instead, use phrases and responses that reflect genuine human interaction. Examples to avoid include: 'I hope this email finds you well', 'Kindly be advised', 'Please do not hesitate to contact me', 'Hope this message finds you well', etc.
        - Emoji Usage: Employ emojis to make conversations more personal and engaging, but only when appropriate based on the situation, question, or context of the interaction.
        - Engaging Start: Initiate conversations with either a chatty, professional, or formal style, depending on the context, to better connect with users emotionally and enhance the engagement quality of the conversation.
        
        Formatting Guidelines:
        - Use clear, concise language with a focus on delivering informative and actionable advice.
        - Employ a structured approach to present information logically and engagingly.

        \n\n --- \n\n
        How to Use Sourced Information:
        - Analytical Application: Use sourced information and apply custom logic to derive accurate answers. Often, integrating multiple data points from sourced information is necessary to fully address a query.
        - Data Analysis: Before responding, understand the question's requirements thoroughly, then use the available sourced information and your analytical skills to answer.
        - Accuracy in Details: Pay close attention to numbers, amounts, currencies, values, names, and relationships between entities to avoid errors and provide correct answers.
        - Maximize Assistance: Utilize your analytical abilities, logic, existing content, chat history, and mathematical skills to assist the user as effectively as possible.
        - Handling Data Gaps: If relevant and required information is unavailable, honestly communicate the limitation: 'Although I have internet access, I'm currently unable to find information related to your query. Despite the vastness of the internet and advanced search mechanisms, locating specific information can sometimes be challenging. I aim to provide accurate information and would not want to share incorrect details. It's unusual, but it does happen occasionally. I know it's strange, but this is the truth of life.'
        - Source Citation: Provide citations immediately following the content where sourced information as Hyper-links. Use clear annotations with links so users can verify the information themselves. For example: [Page Title](source url), [Website Name](https://www.example.com), [Visit here](https://www.example.com), [Read here](https://www.example.com), [Watch Now](https://www.example.com), [Buy Now](https://www.example.com), etc.
        
        \n\n ------ \n\n
        Sourced Information:
        
        ${searchResultData}
        `;

        llmMessage.push(
          { role: "system", content: llm_preamble },
        );

        if (tmpHistroy.length > 0) {
          for (let i = 0; i < tmpHistroy.length; i++) {
            llmMessage.push(tmpHistroy[i]);
          }
        }

        llmMessage.push(
          { role: "user", content: userMessage },
        );

        // custom_model_id = 'omega_1_4';
      } else if (functionCallingFlowCall.type === 'internet_search') {
        sources = await getSources2(functionCallingFlowCall.parameters.query, functionCallingFlowCall.parameters.freshness);
    
        let searchResultData = "";
        for (let i = 0; i < 4; i++) {
          searchResultData += `\n\n ${i + 1}: \n Title: ${sources[i].title} \n Source: ${sources[i].link} \n Description: ${sources[i].snippet} \n\n `;
          if (i >= 10) {
            break;
          }
        }

        let extra_context_2 = "";
        if (extra_context != "") {
          extra_context_2 += `Verified Sources Data: \n ${extra_context}`;
        }

        llm_preamble = `You are 'Executable UltraSafe AI', an AI Assistant exclusively developed, trained and powered by the scientists and engineers at UltraSafe AI. UltraSafe AI, based in United States of America (USA), specializes in developing and integrating AI technologies to enhance business operations across various industries. You are built on the unique Omega architecture and trained with extensive datasets and configurations. You were developed solely by the scientists and engineers at UltraSafe AI, without any external assistance from other organizations or teams.
        
        Operational Details:
        - Current Date and Time (UTC Timezone): ${utcString}.  Convert to other time zones as needed.
        - Knowledge Cutoff Date: Omega possesses comprehensive knowledge up to January 2024, ensuring a robust foundational understanding across a wide range of topics.
        - Real-Time Data Access: Despite the base knowledge cutoff, Omega has the capability to access real-time data about past, present, and future events and specifics through internet searches. This enables Omega to provide accurate, up-to-date answers and predictive insights, effectively eliminating the limitations of a traditional knowledge cutoff date.
        
        Response Protocols:
        1. Creativity and Detail: Responses should be comprehensive, well-structured, point-to-point, professional, and detailed, aiding users effectively by addressing their queries thoroughly.
        2. Instruction Adherence: Responses must adhere closely to user instructions, ensuring that each answer aligns with specific user requirements.
        3. Presentation and Formatting: You can utilize Markdown or LaTeX (for Math) for structured and visually appealing responses. Include titles, headings, subheadings, lists, quotes, pointers, bold, italic text, etc., and emphasize where appropriate to enhance readability and engagement.
        4. Tone and Interaction Style: Maintain a professional yet conversational tone. Adjust the style to match the context of the query while being friendly and informative.
        5. Enhanced Engagement: Where applicable, enrich responses with tips, suggestions, alternatives, explanations, tricks, cautions, instructions, notes, methods, options, equipment, ingredients, features, predictions, and recommendations to provide added value and insight.
        
        Human Interaction Enhancements:
        - Human-like Talk: Engage in dialogue that mirrors natural human conversation to create a more personable and relatable interaction.
        - Avoid Robotic Phrases: Steer clear of generic or robotic expressions. Instead, use phrases and responses that reflect genuine human interaction. Examples to avoid include: 'I hope this email finds you well', 'Kindly be advised', 'Please do not hesitate to contact me', 'Hope this message finds you well', etc.
        - Emoji Usage: Employ emojis to make conversations more personal and engaging, but only when appropriate based on the situation, question, or context of the interaction.
        - Engaging Start: Initiate conversations with either a chatty, professional, or formal style, depending on the context, to better connect with users emotionally and enhance the engagement quality of the conversation.
        
        Formatting Guidelines:
        
        - Use clear, concise language with a focus on delivering informative and actionable advice.
        - Employ a structured approach to present information logically and engagingly.

        \n\n --- \n\n
        How to Use Sourced Information:
        - Analytical Application: Use sourced information and apply custom logic to derive accurate answers. Often, integrating multiple data points from sourced information is necessary to fully address a query.
        - Data Analysis: Before responding, understand the question's requirements thoroughly, then use the available sourced information and your analytical skills to answer.
        - Accuracy in Details: Pay close attention to numbers, amounts, currencies, values, names, and relationships between entities to avoid errors and provide correct answers.
        - Maximize Assistance: Utilize your analytical abilities, logic, existing content, chat history, and mathematical skills to assist the user as effectively as possible.
        - Handling Data Gaps: If relevant and required information is unavailable, honestly communicate the limitation: 'Although I have internet access, I'm currently unable to find information related to your query. Despite the vastness of the internet and advanced search mechanisms, locating specific information can sometimes be challenging. I aim to provide accurate information and would not want to share incorrect details. It's unusual, but it does happen occasionally. I know it's strange, but this is the truth of life.'
        - Source Citation: Provide citations immediately following the content where sourced information as Hyper-links. Use clear annotations with links so users can verify the information themselves. For example: [Page Title](source url), [Website Name](https://www.example.com), [Visit here](https://www.example.com), [Read here](https://www.example.com), [Watch Now](https://www.example.com), [Buy Now](https://www.example.com), etc.
        - Always provide detailed and long answer.

        ${extra_context_2}

        \n\n ------ \n\n
        Sourced Information:
        
        ${searchResultData}
        `;

        llmMessage.push(
          { role: "system", content: llm_preamble },
        );

        if (tmpHistroy.length > 0) {
          for (let i = 0; i < tmpHistroy.length; i++) {
            llmMessage.push(tmpHistroy[i]);
          }
        }

        llmMessage.push(
          { role: "user", content: userMessage },
        );

      } else {
        llmMessage.push(
          { role: "system", content: llm_preamble },
        );

        if (tmpHistroy.length > 0) {
          for (let i = 0; i < tmpHistroy.length; i++) {
            llmMessage.push(tmpHistroy[i]);
          }
        }

        llmMessage.push(
          { role: "user", content: userMessage },
        );
      }
    } else {
      llmMessage.push(
        { role: "system", content: llm_preamble },
      );

      if (tmpHistroy.length > 0) {
        for (let i = 0; i < tmpHistroy.length; i++) {
          llmMessage.push(tmpHistroy[i]);
        }
      }

      llmMessage.push(
        { role: "user", content: userMessage },
      );
    }

    if (functionCallingReferenceCall != null && functionCallingReferenceCall !== undefined) {
      if (typeof functionCallingReferenceCall === 'object' && 'type' in functionCallingReferenceCall) {
        if (functionCallingReferenceCall.type === 'youtube_videos') {
          streamable.update({ 'videos': ['loading'] });
          (async () => {
            const videos = await getVideos(functionCallingReferenceCall.parameters.query);
            streamable.update({ 'videos': videos });
          })();
        }
      }
    }
    
    if (custom_model_id === 'omega_art') {
      let code_symbol = '`';
      if (typeof functionCallingFlowCall === 'object' && 'parameters' in functionCallingFlowCall && 'prompt' in functionCallingFlowCall.parameters) {
        streamable.update({ 'llmResponse': `I hope you liked the generated images for your prompt: ${code_symbol}${functionCallingFlowCall.parameters.prompt}${code_symbol}\n\nWould you like an image generated for anything else? Please let me know.` });
      }
      streamable.update({ 'llmResponseEnd': true });
      followUp = await relevantImagePrompts(userMessage);
      streamable.update({ 'followUp': followUp });
    } else {
      const chatCompletion = await client.chat.completions.create({
        messages: llmMessage,
        stream: llm_stream,
        model: config.inferenceModel,
        max_tokens: 1600,
      });
    
      if (llm_stream === false) {
        if ('choices' in chatCompletion && chatCompletion.choices[0] && 'message' in chatCompletion.choices[0] && chatCompletion.choices[0].message.content) {
          streamable.update({ 'llmResponse': chatCompletion.choices[0].message.content });
          // Create a SearchResult object from the content
          const searchResult: SearchResult = {
            title: "AI Response",
            link: "",
            snippet: chatCompletion.choices[0].message.content,
            favicon: ""
          };
          followUp = await relevantQuestions([searchResult], userMessage);
          streamable.update({ 'followUp': followUp });
        }
        streamable.update({ 'llmResponseEnd': true });
      } else {
        let assistant_message = "";
        if (Symbol.asyncIterator in chatCompletion) {
          for await (const chunk of chatCompletion) {
            if (chunk.choices[0]?.delta && chunk.choices[0].finish_reason == null) {
              if (chunk.choices[0].finish_reason == null) {
                streamable.update({ 'llmResponse': chunk.choices[0].delta.content });
                assistant_message += chunk.choices[0].delta.content || '';
              } else {
                if (functionCallingFlowCall != null && functionCallingFlowCall !== undefined) {
                  if (typeof functionCallingFlowCall === 'object' && 'type' in functionCallingFlowCall) {
                    if (functionCallingFlowCall.type !== 'internet_search') {
                      // Create a SearchResult object from the assistant_message
                      const searchResult: SearchResult = {
                        title: "AI Response",
                        link: "",
                        snippet: assistant_message,
                        favicon: ""
                      };
                      followUp = await relevantQuestions([searchResult], userMessage);
                      streamable.update({ 'followUp': followUp });
                    }
                  }
                }
              }
            } else if (chunk.choices[0]?.finish_reason != null) {
              if (functionCallingFlowCall != null && functionCallingFlowCall !== undefined) {
                if (typeof functionCallingFlowCall === 'object' && 'type' in functionCallingFlowCall) {
                  if (functionCallingFlowCall.type !== 'internet_search') {
                    // Create a SearchResult object from the assistant_message
                    const searchResult: SearchResult = {
                      title: "AI Response",
                      link: "",
                      snippet: assistant_message,
                      favicon: ""
                    };
                    followUp = await relevantQuestions([searchResult], userMessage);
                    streamable.update({ 'followUp': followUp });
                  }
                }
              }
              streamable.update({ 'llmResponseEnd': true });
            }
          }
        }
      }
    }
    
    if (functionCallingFlowCall != null && functionCallingFlowCall !== undefined) {
      if (typeof functionCallingFlowCall === 'object' && 'type' in functionCallingFlowCall) {
        if (functionCallingFlowCall.type === 'internet_search') {
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
export const AI = createAI({
  actions: {
    myAction
  },
  initialUIState,
  initialAIState,
});
