export const Response = ({message}: any) => (
    <div className="chat-message user flex justify-start mb-2">
        <div className="bg-blue-200 rounded-lg px-4 py-2 whitespace-pre-line" style={{ direction: 'ltr' }}>
        {message}
        </div>
    </div>
)