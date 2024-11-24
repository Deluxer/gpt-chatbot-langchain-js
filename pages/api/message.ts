import { ConversationChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { Ollama } from "@langchain/ollama";
import { BufferMemory } from "langchain/memory";
import { MongoDBChatMessageHistory, MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const client = new MongoClient(process.env.MONGODB_ATLAS_URI || "");
    await client.connect();
    const collection = client.db("chatbot").collection("messages"); 

    if (req.method === 'POST') {
        const { prompt, session } = req.body

        const ollama = new Ollama({
            baseUrl: "http://127.0.0.1:11434",
            model: "qwen2.5-coder:14b",
        });

        const memory = new BufferMemory({
            chatHistory: new MongoDBChatMessageHistory({
                collection,
                sessionId: session,
            })
        });
        const chain = new ConversationChain({ llm: ollama, memory: memory });

        const response = await chain.call({
            input: prompt,
        });

        res.status(200).json({ message: response.response })
    } else if(req.method === 'GET') {
        const messages = await collection.find({}).next()
        let sessionId: any;


        sessionId = messages ? messages.sessionId : new ObjectId().toString();

        res.status(404).json({ session: sessionId ,message: messages ? messages?.messages: [] })
    } else {
        res.status(404).json({ message: 'Method not allowed' })
    }
}
