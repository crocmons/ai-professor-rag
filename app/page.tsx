"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { BotIcon, UserIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import loader from "@/public/assets/icons/loader.svg";
import send from "@/public/assets/icons/send.svg";

export default function Chat() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! I'm the Professor AI support assistant. How can I help you today?`,
    },
  ]);
  const [message, setMessage] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const chatParent = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
  
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
  
    setMessage("");
    setIsFetching(true);
  
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([...messages, { role: "user", content: message }]),
      });
  
      if (!response.body) {
        throw new Error("Response body is null");
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
  
      const processText = async ({
        done,
        value,
      }: ReadableStreamReadResult<Uint8Array>): Promise<string> => {
        if (done) {
          setIsFetching(false);
          return result;
        }
  
        const text = decoder.decode(value || new Uint8Array(), { stream: true });
  
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
  
        result += text; // Accumulate the result text
  
        const next = await reader.read();
        return processText(next);
      };
  
      await reader.read().then(processText);
    } catch (error) {
      setMessages((messages) => [
        ...messages,
        {
          role: "assistant",
          content: "Something Went Wrong...Please try again later.",
        },
      ]);
      setIsFetching(false);
    }
  };
  
  

  return (
    <div className="bg-gray-100 w-full h-screen border border-gray-400 flex flex-col justify-center items-center mx-auto">
      <div className="shadow-lg rounded-lg w-full max-w-2xl p-6 space-y-6 flex flex-col justify-center items-center mt-10">
        <h1 className="blue_gradient text-center text-3xl font-medium mx-auto">
          AI Professor
        </h1>
        <div
          className="overflow-y-auto max-h-[500px] w-full space-y-4"
          ref={chatParent}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "assistant" ? "justify-start" : "justify-end"
              }`}
              ref={index === messages.length - 1 ? lastMessageRef : null}
            >
              {message.role === "assistant" && (
                <div className="flex items-center mr-4">
                  <div className="bg-gray-700 text-white p-2 rounded-full">
                    <BotIcon />
                  </div>
                </div>
              )}
              <div
                className={`p-4 rounded-lg max-w-[75%] ${
                  message.role === "assistant"
                    ? "bg-gray-300 text-black font-medium"
                    : "bg-blue-500 text-white font-normal"
                }`}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
        <div className="w-full flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 bg-gray-200 text-black font-medium rounded focus:outline-none border border-gray-500 focus:border-gray-400"
            placeholder="write your query"
          />
          <button
            onClick={sendMessage}
            className="bg-gray-300 font-oswald font-semibold px-4 py-2 rounded hover:bg-blue-500 flex items-center justify-center transition-all"
          >
            {isFetching ? (
              <Image src={loader} alt="loader" width={24} height={24} />
            ) : (
              <Image src={send} alt="send" width={24} height={24} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
