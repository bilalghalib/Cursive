import { getConfig } from './config.js';
import { EDGE_FUNCTIONS, SUPABASE_ANON_KEY } from './supabaseConfig.js';

export async function sendImageToAI(imageData) {
  try {
    const config = await getConfig();
    const response = await fetch(EDGE_FUNCTIONS.claudeProxy, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
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
                text: "Transcribe this handwritten text and respond with ONLY valid JSON (no markdown code blocks, no extra text):\n" +
                "{\n" +
                "  \"transcription\": \"provide only transcription of the handwriting\",\n" +
                "  \"tags\": [\"tag1\", \"tag2\", \"tag3\", \"tag4\", \"tag5\"]\n" +
                "}\n" +
                "Provide up to 5 relevant tags for the content. Return ONLY the JSON object, nothing else."
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

export async function sendChatToAI(chatHistory, onProgress = null) {
  try {
    const config = await getConfig();
    
    // If no progress callback is provided, use the standard non-streaming approach
    if (!onProgress) {
      const response = await fetch(EDGE_FUNCTIONS.claudeProxy, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
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
    } 
    // If progress callback provided, use streaming approach
    else {
      const response = await fetch(EDGE_FUNCTIONS.claudeProxy, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          model: config.claude.model,
          max_tokens: config.claude.max_tokens,
          messages: chatHistory,
          stream: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AI API streaming request failed: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        try {
          const lines = chunk.split('\n\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;
              
              const json = JSON.parse(jsonStr);
              if (json.content && json.content[0] && json.content[0].text) {
                const text = json.content[0].text;
                fullText += text;
                if (onProgress) onProgress(fullText);
              }
            }
          }
        } catch (e) {
          console.error('Error parsing streaming response:', e);
        }
      }
      
      return fullText;
    }
  } catch (error) {
    console.error('Error in AI chat service:', error);
    throw error;
  }
}

function parseAIResponse(response) {
  try {
    // Claude 4.5 may wrap JSON in markdown code blocks - strip them
    let cleanedResponse = response.trim();

    // Remove markdown code block markers if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedResponse = JSON.parse(cleanedResponse);
    return {
      transcription: parsedResponse.transcription || '',
      tags: parsedResponse.tags || [],
      fullResponse: response
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Raw response:', response);
    return {
      transcription: 'Error parsing AI response',
      tags: [],
      fullResponse: response
    };
  }
}
