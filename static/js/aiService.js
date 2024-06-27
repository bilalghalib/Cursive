import { getConfig } from './config.js';

const BASE_URL = `http://${window.location.hostname}:5022/api/claude`;

export async function sendImageToAI(imageData) {
  try {
    const config = await getConfig();
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.claude.model,
        max_tokens: config.claude.max_tokens,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png", // Adjust this based on your image type
                  data: imageData.split(',')[1] // Remove the data:image/jpeg;base64, part
                }
              },
              {
                type: "text",
                text: "Transcribe this handwritten text and respond in valid JSON with the following structure:\n" +
                "{\n" +
                "  \"transcription\": \"provide only transcription of the handwriting\",\n" +
                "  \"tags\": [\"tag1\", \"tag2\", \"tag3\", \"tag4\", \"tag5\"]\n" +
                "}\n" +
                "Provide up to 5 relevant tags for the content."
              }
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI API request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    return parseAIResponse(data.content[0].text);
  } catch (error) {
    console.error('Error in AI image service:', error);
    throw error;
  }
}

export async function sendChatToAI(chatHistory) {
  try {
    const config = await getConfig();
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.claude.model,
        max_tokens: config.claude.max_tokens,
        messages: chatHistory
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI API request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Error in AI chat service:', error);
    throw error;
  }
}

function parseAIResponse(response) {
  try {
    const parsedResponse = JSON.parse(response);
    return {
      transcription: parsedResponse.transcription || '',
      tags: parsedResponse.tags || [],
      fullResponse: response
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return {
      transcription: 'Error parsing AI response',
      tags: [],
      fullResponse: response
    };
  }
}

function downloadImage(dataUrl, filename) {/*
   const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); 
*/}
