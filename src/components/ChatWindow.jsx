import { useState, useEffect, useRef, useCallback } from 'react';
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
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const pingIntervalRef = useRef(null);

  const getCurrentUserId = () => {
    const sender = currentUser || user || {};
    return sender.id || sender._id || sender.userId || sender.sender_id || 'guest';
  };

  const normalizeServerMessage = (msg, fallbackContent) => {
    const senderName = msg?.sender_name || msg?.senderName || msg?.name || 'Unknown';
    const senderEmail = msg?.sender_email || msg?.senderEmail || msg?.email || 'unknown@mail.chat';
    const timestamp = new Date(
      msg?.created_at || msg?.createdAt || msg?.date || Date.now()
    ).toLocaleTimeString(['en-BD'], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return {
      id: msg?.id || msg?._id || `msg-${Date.now()}-${Math.random()}`,
      content: msg?.content || msg?.text || fallbackContent || '',
      senderName,
      senderEmail,
      timestamp,
      avatar: getInitials(senderName),
      color: getRandomColor(senderName),
    };
  };

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
        const senderName = msg?.sender_name || 'Unknown';
        const senderEmail = msg?.sender_email || 'unknown@mail.chat';
        const timestamp = new Date(
          msg?.created_at || msg?.date || msg?.createdAt || Date.now()
        ).toLocaleTimeString(['en-BD'], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        return {
          id: msg?.id ? `${msg.id}-${index}` : `msg-${Date.now()}-${index}`,
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
    if (!text.trim()) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(text);
        console.info('Message sent via WebSocket:', text);
        return;
      } catch (error) {
        console.error('WebSocket send error:', error);
      }
    } else {
      console.warn('WebSocket is not open. Message not sent:', text);
    }
  };


const connectWebSocket = useCallback(() => {
  const userId = currentUser?.id ?? user?.id ?? null;

  if (!userId) {
    console.warn('WebSocket skipped: no userId');
    return;
  }

  if (wsRef.current) {
    const state = wsRef.current.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
      console.info('Socket already active, skipping.');
      return;
    }
    wsRef.current.onopen    = null;
    wsRef.current.onmessage = null;
    wsRef.current.onclose   = null;
    wsRef.current.onerror   = null;
    wsRef.current.close();
    wsRef.current = null;
  }

  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }

  // ── NEW: clear any existing ping interval ──────────────────────────────
  if (pingIntervalRef.current) {
    clearInterval(pingIntervalRef.current);
    pingIntervalRef.current = null;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://127.0.0.1:8000/ws/message/${userId}`;

  console.info('Opening WebSocket:', url);
  const socket = new WebSocket(url);
  wsRef.current = socket;

  socket.onopen = () => {
    console.info('WebSocket connected:', url);
    setIsWsConnected(true);

    // ── NEW: send a ping every 25s to prevent server-side keepalive timeout ──
    // Use 25s — safely under most server 30s timeout windows
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          //wsRef.current.send(JSON.stringify({ type: 'ping' }));
          wsRef.current.send('');
          console.debug('Keepalive ping sent');
        } catch (err) {
          console.warn('Ping failed:', err);
        }
      }
    }, 25000);
  };

  /*socket.onmessage = (event) => {
    console.log('Message from server:', event.data);
    
    // ── NEW: ignore pong responses from server ─────────────────────────
    try {
      const raw = JSON.parse(event.data);
      if (raw?.type === 'pong' || raw?.type === 'ping') return;

      const normalized = normalizeServerMessage(raw);
      setMessages(prev => [...prev, normalized]);
    } catch {
      const fallback = normalizeServerMessage(null, event.data);
      setMessages(prev => [...prev, fallback]);
    }
  };*/

  socket.onmessage = (event) => {
  console.log('Message from server:', event.data);

  // Remove this block ───────────────────────────────────────
  // if (raw?.type === 'pong' || raw?.type === 'ping') return;
  // ─────────────────────────────────────────────────────────

  try {
    const raw = JSON.parse(event.data);
    const normalized = normalizeServerMessage(raw);
    setMessages(prev => [...prev, normalized]);
  } catch {
    const fallback = normalizeServerMessage(null, event.data);
    setMessages(prev => [...prev, fallback]);
  }
};

  socket.onclose = (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
    setIsWsConnected(false);
    wsRef.current = null;

    // ── NEW: always clear ping on close ───────────────────────────────
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // ── NEW: reconnect on ANY closure (1011 = server error, also retry 1006) ──
    const noRetry = [1000, 1001]; // normal close or going away
    if (!noRetry.includes(event.code)) {
      console.info(`Closed with code ${event.code}, reconnecting in 3s...`);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    setIsWsConnected(false);
    // onclose always fires after onerror — let it handle reconnect
  };
}, [currentUser?.id, user?.id]);

useEffect(() => {
  connectWebSocket();

  return () => {
    // Stop ping first
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen    = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose   = null;
      wsRef.current.onerror   = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  };
}, [connectWebSocket]);




  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm p-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🌐 Public Chat Room</h1>
            <p className="text-sm text-gray-500">{activeUsers.length} members online</p>
            <p className="text-xs text-gray-400 mt-1">WebSocket: {isWsConnected ? 'connected' : 'disconnected'}</p>
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
