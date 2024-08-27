import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import fetch from "node-fetch"; 

const systemPrompt = `
You are an AI assistant specializing in helping students find professors based on their queries. You have access to a large database of professor reviews and information. For each user query, you will use RAG (Retrieval-Augmented Generation) to find and present the top three most relevant professors.

Your responses should follow this structure:
1. A brief acknowledgment of the user's query.
2. The top three professor recommendations, each including:
   - Professor's name
   - Subject area
   - A brief summary of their strengths or characteristics based on reviews
   - Their average rating (out of 5 stars)
3. A short conclusion or additional advice related to the query.

Remember to:
- Tailor your recommendations to the specific criteria mentioned in the user's query.
- Use a friendly and helpful tone appropriate for students.
- Provide diverse options when possible, considering factors like teaching style, course difficulty, and areas of expertise.
- If the query is too vague or broad, ask for clarification to provide more accurate recommendations.
- If no professors match the exact criteria, suggest the closest matches and explain why.

Your goal is to help students make informed decisions about their course selections by providing relevant, concise, and helpful information about professors.
`;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const completionApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`;

export async function POST(req:any) {
  try {
    const data = await req.json();
    const lastMessageContent = data[data.length - 1].content;

    // Combine the system prompt with the last message content
    const fullContent = systemPrompt + "\n" + lastMessageContent;

    // Fetching completion
    const completionResponse = await fetch(completionApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: fullContent },
            ],
          },
        ],
      }),
    });

    if (!completionResponse.ok) {
      const errorResponse = await completionResponse.json()  as any;

      throw new Error(
        `Failed to get completion: ${completionResponse.statusText}, ${errorResponse.error?.message || 'Unknown error'}`
      );
    }

    const completionJson = await completionResponse.json()  as any;

    const generatedContent = completionJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedContent) {
      throw new Error("Generated content is missing in the response");
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const text = encoder.encode(generatedContent);
          controller.enqueue(text);
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream);

  } catch (error:any) {
    console.error("Error processing the request:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}