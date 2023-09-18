export const Question = ({message}: any) => (
    <div className="chat-message bot flex justify-end mb-2">
    <div className="bg-green-200 rounded-lg px-4 py-2">
      {message}
    </div>
  </div>
)