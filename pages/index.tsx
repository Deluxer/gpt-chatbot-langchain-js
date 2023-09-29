import { useEffect, useState } from 'react'
import { Question } from '@/components/question';
import { Response } from '@/components/response';

interface Message {
  type: string;
  message: string;
}

export default function Home() {
  const [conversation, setConversation] = useState<Message[]>([])
  const [session, setSession] = useState('')

useEffect(() => {

  const loadMessages = async() => {
    const responseData = await fetch('http://localhost:3000/api/message')
    
    const messages = await responseData.json()
    messages.message.map((message: any) => {
      message.type === 'human' 
      ? setConversation(conversation => [...conversation, {type: 'human', message: message.data.content}])
      : setConversation(conversation => [...conversation, {type: 'ai', message: message.data.content}])
    })
    
    setSession(messages.session)
  }

  loadMessages()

}, [])



  const onSubmitChat = async(e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const prompt = e.currentTarget.chatText.value;
    e.currentTarget.chatText.value = ''
    setConversation(conversation => [...conversation, {type: 'human', message: prompt}])

    const responseData = await fetch('http://localhost:3000/api/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, session })
    })

    const response = await responseData.json();

    
    setConversation(conversation =>[...conversation, {type: 'ai', message: response.message}])
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
