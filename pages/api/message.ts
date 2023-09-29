import { ConversationChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { BufferMemory } from "langchain/memory";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { prompt } = req.body

        const llm = new ChatOpenAI({
            openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            modelName: 'gpt-3.5-turbo',
            temperature: 0,
            streaming: true
        });

        const memory = new BufferMemory();
        const chain = new ConversationChain({ llm: llm, memory: memory });

        const response = await chain.call({
            input: prompt,
        });

        res.status(200).json({ message: response.response })
    } else {
        res.status(404).json({ message: 'Method not allowed' })
    }
}
