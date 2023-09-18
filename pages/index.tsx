import { useEffect, useState } from 'react'
import { OpenAI } from "langchain/llms/openai";
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import { Question } from '@/components/question';
import { Response } from '@/components/response';

interface Message {
  type: string;
  message: string;
}

export default function Home() {
  const [conversation, setConversation] = useState<Message[]>([])
  const [chain, setChain] = useState<ConversationChain>()
  const [responseOnline, setResponseOnline] = useState('')

  useEffect(() => {
    const llm = new OpenAI({
      openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
      temperature: 0,
      streaming: true
    });
  
    const memory = new BufferMemory();
    const conversationChain = new ConversationChain({ llm: llm, memory: memory });
    setChain(conversationChain)
  }, [])

  const onSubmitChat = async(e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if(!chain) return;

    const prompt = e.currentTarget.chatText.value;
    e.currentTarget.chatText.value = ''
    setConversation(conversation => [...conversation, {type: 'human', message: prompt}])

    const response = await chain.call({
      input: prompt,
      callbacks: [
        {
          handleLLMNewToken(token: string) {
            setResponseOnline(prev => prev + token)
          }
        }
      ]
    });
    
    setConversation(conversation =>[...conversation, {type: 'ai', message: response.response}])

    setResponseOnline('')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-12">
    <section className="bg-gray-100 w-full">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto my-10 bg-white shadow-lg rounded-lg p-4">
          <div className="text-center text-2xl font-bold mb-4">Botcito</div>
          <div className="chat-container h-96 overflow-y-scroll p-4 border border-gray-300 rounded-lg"> {/* Aumenta la altura aquí */}
            <div className="flex flex-col space-y-2">
              
            {
              conversation.map((message, index) => 
                message.type === 'human' 
                ? <Question key={index} message={message.message} />
                : <Response key={index} message={message.message} />
              )
            }
            {
              responseOnline ? <Response message={responseOnline} /> : ''
            }
            
            </div>
          </div>
          <form onSubmit={onSubmitChat} className="w-full text-center mt-4 flex items-stretch">
            <textarea
              rows={3}
              name="chatText"
              className="w-3/4 px-4 py-2 border border-gray-300 rounded-l-lg resize-none focus:outline-none"
              placeholder="Escribe tu mensaje aquí..."
            />
            <button
              type="submit"
              className="w-1/4 px-4 py-2 bg-blue-600 hover:bg-blue-800 text-white font-bold rounded-r-lg transition duration-200 ease-in-out flex items-center justify-center"
            >
              Enviar
            </button>
          </form>

        </div>
      </div>
    </section>
  </main>
  )
}
