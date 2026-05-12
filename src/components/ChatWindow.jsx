import { useState, useEffect, useRef } from 'react';
import MessageInput from './MessageInput';
import Swal from "sweetalert2";

function ChatWindow({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : user || null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return user || null;
    }
  });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOnlineUsers = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/users/online');
      if (!response.ok) {
        throw new Error(`Failed to fetch online users with status : ${response.status}`);
      }

      const data = await response.json();
      const users = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : data.users || [];
      setActiveUsers(users);
    } catch (error) {
      Swal.fire({
        title: "Error!",
        text: error.message,
        icon: "error",
        confirmButtonText: "OK"
      });
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/message/list');
      if (!response.ok) {
        throw new Error(`Failed to fetch messages with status : ${response.status}`);
      }

      const data = await response.json();
      const messagesData = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.messages)
        ? data.messages
        : [];

      const normalizedMessages = messagesData.map((msg, index) => {
        const senderName = msg?.sender_name|| 'Unknown';
        const senderEmail = msg?.sender_email || 'unknown@mail.chat';
        const timestamp = new Date(
          msg?.created_at || msg?.date || msg?.createdAt || Date.now()
        ).toLocaleTimeString(['en-BD'], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        return {
          id: msg?.id || `msg-${Date.now()}-${index}`,
          content: msg?.content || '',
          senderName,
          senderEmail,
          timestamp,
          avatar: getInitials(senderName),
          color: getRandomColor(senderName),
        };
      });

      setMessages(normalizedMessages);
    } catch (error) {
      Swal.fire({
        title: "Error!",
        text: error.message,
        icon: "error",
        confirmButtonText: "OK"
      });
    }
  };

  useEffect(() => {
    fetchOnlineUsers();
    fetchMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRandomColor = (name) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-cyan-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleSendMessage = async (text) => {
    const sender = currentUser || user || { name: 'Guest', email: 'guest@rabbit.chat', id: 'guest' };
    const senderId = sender.id || sender._id || sender.userId || 'guest';

    const outgoingMessage = {
      id: Date.now(),
      content: text,
      senderName: sender.name,
      senderEmail: sender.email,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: getInitials(sender.name),
      color: getRandomColor(sender.name),
    };

    setMessages((prev) => [...prev, outgoingMessage]);

    try {
      const response = await fetch('http://127.0.0.1:8000/message/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: senderId,
          content: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message with status: ${response.status}`);
      }

      const data = await response.json();
      const savedMessage = data?.message || data?.data || data;
      if (savedMessage) {
        const serverMessage = {
          id: savedMessage.id || savedMessage._id || outgoingMessage.id,
          content: savedMessage.content || savedMessage.text || text,
          senderName: savedMessage.senderName || savedMessage.sender_name || sender.name,
          senderEmail: savedMessage.senderEmail || savedMessage.sender_email || sender.email,
          timestamp: new Date(savedMessage.created_at || savedMessage.date || savedMessage.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: getInitials(sender.name),
          color: getRandomColor(sender.name),
        };

        setMessages((prev) => prev.map((msg) => (msg.id === outgoingMessage.id ? serverMessage : msg)));
      }
    } catch (error) {
      Swal.fire({
        title: 'Send Failed',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }

    // Simulate random user response
    /*setTimeout(() => {
      const randomUser = activeUsers.length
        ? activeUsers[Math.floor(Math.random() * activeUsers.length)]
        : { name: 'Rabbit Bot', email: 'bot@rabbit.chat' };

      const botMessage = {
        id: Date.now() + 1,
        content: getBotResponse(text),
        senderName: randomUser.name,
        senderEmail: randomUser.email,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: getInitials(randomUser.name),
        color: getRandomColor(randomUser.name),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 800);*/
  };

  const getBotResponse = (userMessage) => {
    const responses = [
      'That sounds interesting! Tell me more!',
      'I totally agree with you!',
      'That\'s a great point!',
      'Thanks for sharing!',
      'How did that make you feel?',
      'That\'s awesome! 🎉',
      'I understand. What happened next?',
      'Tell me more about that!',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm p-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🌐 Public Chat Room</h1>
            <p className="text-sm text-gray-500">{activeUsers.length} members online</p>
          </div>
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition duration-200"
          >
            Logout
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 text-lg">Welcome to Public Chat!</p>
                <p className="text-gray-400 text-sm mt-2">Start chatting with others...</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="flex gap-3 animate-fade-in hover:bg-gray-100 p-2 rounded transition"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full ${msg.color} text-white flex items-center justify-center font-bold text-sm shadow-md`}>
                    {msg.avatar}
                  </div>
                </div>

                {/* Message Container */}
                <div className="flex-1">
                  {/* Sender Info */}
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{msg.senderName}</p>
                    <p className="text-xs text-gray-500">{msg.senderEmail}</p>
                    <p className="text-xs text-gray-400">{msg.timestamp}</p>
                  </div>

                  {/* Message Text */}
                  <div className="mt-1">
                    <p className="text-gray-700 break-words">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <MessageInput onSendMessage={handleSendMessage} />
      </div>

      {/* Right Sidebar - Active Users */}
      <div className="w-72 bg-white border-l border-gray-200 shadow-lg flex flex-col">
        {/* Members Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">👥 Members ({activeUsers.length})</h2>
          <p className="text-xs text-green-600 mt-1">● All online</p>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeUsers.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition">
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full ${getRandomColor(member.name)} text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow`}>
                {getInitials(member.name)}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{member.name}</p>
                <p className="text-xs text-gray-500 truncate">{member.email}</p>
              </div>

              {/* Status Indicator */}
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"></div>
            </div>
          ))}
        </div>

        {/* Your Profile */}
        <div className="p-4 border-t border-gray-200 bg-blue-50">
          <p className="text-xs font-semibold text-gray-600 uppercase">You</p>
          <div className="flex items-center gap-3 mt-2">
            <div className={`w-10 h-10 rounded-full ${getRandomColor(currentUser?.name || user?.name || 'Guest')} text-white flex items-center justify-center font-bold text-sm shadow`}>
              {getInitials((currentUser || user || { name: 'Guest' }).name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{(currentUser || user || { name: 'Guest' }).name}</p>
              <p className="text-xs text-gray-500 truncate">{(currentUser || user || { email: 'guest@rabbit.chat' }).email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
