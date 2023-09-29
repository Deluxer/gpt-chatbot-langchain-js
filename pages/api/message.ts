import { configMongodb } from "@/utills/config-mongo";
import { ConversationChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { BufferMemory } from "langchain/memory";
import { MongoDBChatMessageHistory } from "langchain/stores/message/mongodb";
import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const collection = await configMongodb()

    if (req.method === 'POST') {
        const { prompt, session } = req.body

        const llm = new ChatOpenAI({
            openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            modelName: 'gpt-3.5-turbo',
            temperature: 0,
            streaming: true
        });

        const memory = new BufferMemory({
            chatHistory: new MongoDBChatMessageHistory({
                collection,
                sessionId: session,
            })
        });
        const chain = new ConversationChain({ llm: llm, memory: memory });

        const response = await chain.call({
            input: prompt,
        });

        res.status(200).json({ message: response.response })
    } else if(req.method === 'GET') {
        const messages = await collection.find({}).next()
        let sessionId: any;

        sessionId = messages ? messages._id : new ObjectId().toString();

        res.status(404).json({ session: sessionId ,message: messages ? messages?.messages: [] })
    } else {
        res.status(404).json({ message: 'Method not allowed' })
    }
}
