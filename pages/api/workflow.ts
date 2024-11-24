import { ConversationChain } from "langchain/chains";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { BufferMemory } from "langchain/memory";
import { MongoDBChatMessageHistory, MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";

import { MemorySaver, Annotation } from "@langchain/langgraph";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from  "langchain/vectorstores/memory";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const client = new MongoClient(process.env.MONGODB_ATLAS_URI || "");
    await client.connect();
    const messageCollection = client.db(process.env.MONGODB_DATABASE).collection("messages");
    const eleganteFlorCollection = client.db(process.env.MONGODB_DATABASE).collection(process.env.MONGODB_VECTOR_COLLECTION_NAME!);

    // Define the graph state
    // See here for more info: https://langchain-ai.github.io/langgraphjs/how-tos/define-state/
    const StateAnnotation = Annotation.Root({
        messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        })
    })

    // Define the tools for the agent to use
    const searchDBTool = tool(async ({ query }) => {
        const vectorStore = new MongoDBAtlasVectorSearch(
            new OllamaEmbeddings({model: 'mxbai-embed-large'}),
            {
              collection: eleganteFlorCollection,
              indexName: process.env.MONGODB_VECTOR_INDEX,
              textKey: "text",
              embeddingKey: "embedding",
            }
        );
        const resultOne = await vectorStore.maxMarginalRelevanceSearch(query, {k: 3, fetchK: 5, lambda: 0.5 });
        // const retriever = vectorStore.asRetriever({
        //     searchType: "mmr",
        //     k:5,
        //     searchKwargs: {
        //       fetchK: 20,
        //       lambda: 1,
        //     },
        //   });
        // const similaritySearchResults = await vectorStore.similaritySearch(prompt, 5);
        // const retrievedDocuments = await retriever.invoke(query);
        console.log('query: ', query)

        let resultString = '';
        for (const doc of resultOne) {
            resultString += `* ${doc.pageContent}\n`;
        }

        console.log(resultString);        

        return resultString
    }, {
        name: "search",
        description: "Call to get the flower catalog",
        schema: z.object({
        query: z.string().describe("The query to use in your search."),
        }),
    });    

    const tools = [searchDBTool];
    const toolNode = new ToolNode(tools);

    const model = new ChatOllama({
        baseUrl: "http://127.0.0.1:11434",
        model: "qwen2.5-coder:14b",
    }).bindTools(tools)

    // const model = new ChatOpenAI({ model: "gpt-4o-mini" }).bindTools(tools);


    // Define the function that determines whether to continue or not
    // We can extract the state typing via `StateAnnotation.State`
    function shouldContinue(state: typeof StateAnnotation.State) {
        const messages = state.messages;
        const lastMessage = messages[messages.length - 1] as AIMessage;
    
        // If the LLM makes a tool call, then we route to the "tools" node
        if (lastMessage.tool_calls?.length && !messages.some((message: any) => message?.tool_call_id )) {
            return "tools";
        }
        // Otherwise, we stop (reply to the user)
        return "__end__";
    }

    // Define the function that calls the model
    async function callModel(state: typeof StateAnnotation.State) {
        console.log('call state: ', state)
        const systemPrompt = 
        "As a professional search expert, you possess the ability to search for any information about Flower shop catalog." +
        "For each user query, utilize the search results to their fullest potential to provide additional information and assistance in your response." +
        "Please do not provide additional out of the search results and *ignore* information that does not correspond to the question" +
        "From the list obtained, recommend 1-2 floral arrangements" 
        "Please respond in *Spanish* and aim to directly address the user's question, augmenting your response with insights gleaned from the search results." ;
      const messages = [{ role: "system", content: systemPrompt }, ...state.messages];        
        const response = await model.invoke(messages);

        if(messages.some((message: any) => message?.tool_call_id !== undefined )) {
            return { messages }
        }        
    
        // We return a list, because this will get added to the existing list
        return { messages: [response] };
    } 

    if (req.method === 'POST') {
        const { prompt, session } = req.body

        // Define a new graph
        const workflow = new StateGraph(StateAnnotation)
        .addNode("agent", callModel)
        .addNode("tools", toolNode)
        .addEdge("__start__", "agent")
        .addConditionalEdges("agent", shouldContinue)
        .addEdge("tools", "agent");

        // Initialize memory to persist state between graph runs
        const checkpointer = new MemorySaver();

        // Finally, we compile it!
        // This compiles it into a LangChain Runnable.
        // Note that we're (optionally) passing the memory when compiling the graph
        const app = workflow.compile({ checkpointer });

        // Use the Runnable
        const finalState = await app.invoke(
            { messages: [new HumanMessage(prompt)] },
            { configurable: { thread_id: session } }
        );

        const aiMessageResponse = finalState.messages[finalState.messages.length - 1].content
        
        console.log('workflow: ', aiMessageResponse);   

        // const memory = new BufferMemory({
        //     chatHistory: new MongoDBChatMessageHistory({
        //         collection: messageCollection,
        //         sessionId: session,
        //     })
        // });
        // const conversationChain = new ConversationChain({ llm: model});

        // const response = await conversationChain.invoke({
        //     input: prompt,
        // });

        // console.log('second response: ', response)

        res.status(200).json({ message: aiMessageResponse })
    } else if(req.method === 'GET') {
        console.log('GET')
        const messages = await messageCollection.find({}).next()
        let sessionId: any;

        console.log('messages: ', messages)

        sessionId = messages ? messages.sessionId : new ObjectId().toString();
        console.log('sessionId: ', sessionId)

        res.status(404).json({ session: sessionId ,message: messages ? messages?.messages: [] })
    } else {
        res.status(404).json({ message: 'Method not allowed' })
    }
}
