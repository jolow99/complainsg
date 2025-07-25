'use client'

import {
  ChatHandler,
  ChatSection as ChatSectionUI,
  Message,
} from '@llamaindex/chat-ui'

import '@llamaindex/chat-ui/styles/markdown.css'
import '@llamaindex/chat-ui/styles/pdf.css'
import '@llamaindex/chat-ui/styles/editor.css'
import { useState, useEffect, useRef } from 'react'

const initialMessages: Message[] = [
  {
    content: 'Write simple Javascript hello world code',
    role: 'user',
  },
  {
    role: 'assistant',
    content:
      'Got it! Here\'s the simplest JavaScript code to print "Hello, World!" to the console:\n\n```javascript\nconsole.log("Hello, World!");\n```\n\nYou can run this code in any JavaScript environment, such as a web browser\'s console or a Node.js environment. Just paste the code and execute it to see the output.',
  },
  {
    content: 'Write a simple math equation',
    role: 'user',
  },
  {
    role: 'assistant',
    content:
      "Let's explore a simple mathematical equation using LaTeX:\n\n The quadratic formula is: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\nThis formula helps us solve quadratic equations in the form $ax^2 + bx + c = 0$. The solution gives us the x-values where the parabola intersects the x-axis.",
  },
]

export function ChatSection() {
  // You can replace the handler with a useChat hook from Vercel AI SDK
  const handler = useMockChat(initialMessages)
  return (
    <div className="w-1/2 flex max-h-[80vh] flex-col gap-6 overflow-y-auto">
      <ChatSectionUI handler={handler} />
    </div>
  )
}

function useMockChat(initMessages: Message[]): ChatHandler {
  const [messages, setMessages] = useState<Message[]>(initMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Connect to WebSocket on component mount
    const ws = new WebSocket('ws://127.0.0.1:8000/ws')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Received message:', data)
        
        // Handle welcome message
        if (data.type === 'connection') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.message
          }])
        }
        
        // Handle message received acknowledgment
        if (data.type === 'message_received') {
          // Temporarily remove the acknowledgment message from UI for cleaner chat
          // setMessages(prev => [...prev, {
          //   role: 'assistant',
          //   content: data.content
          // }])
        }
        
        // Handle llm_output
        if (data.type === 'llm_output') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.content
          }]);
        }
        
        // Handle errors
        if (data.type === 'error') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${data.message}`
          }])
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [])

  const append = async (message: Message) => {
    setIsLoading(true)

    // Add user message to chat
    setMessages(prev => [...prev, message])

    // Send message to WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending message to WebSocket:', message.content)
      wsRef.current.send(JSON.stringify({
        content: message.content
      }))
    } else {
      // Fallback if WebSocket is not connected
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'WebSocket not connected. Please refresh the page.'
      }])
    }

    // const mockContent =
    //   'This is a mock response. In a real implementation, this would be replaced with an actual AI response.'

    // let streamedContent = ''
    // const words = mockContent.split(' ')

    // for (const word of words) {
    //   await new Promise(resolve => setTimeout(resolve, 100))
    //   streamedContent += (streamedContent ? ' ' : '') + word
    //   setMessages(prev => {
    //     return [
    //       ...prev.slice(0, -1),
    //       {
    //         role: 'assistant',
    //         content: streamedContent,
    //       },
    //     ]
    //   })
    // }

    setIsLoading(false)
    return message.content
  }

  return {
    messages,
    input,
    setInput,
    isLoading,
    append,
  }
}
