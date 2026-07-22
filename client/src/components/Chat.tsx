import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import './Chat.css';

const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:5000/api');

interface Message {
  _id?: string;
  roomId: string;
  text: string;
  sender: 'guest' | 'agent';
  senderName?: string;
  timestamp: string;
}

// Sinh hoặc lấy roomId từ localStorage
function getOrCreateRoomId(): string {
  let roomId = localStorage.getItem('chat_room_id');
  if (!roomId) {
    roomId = 'room_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('chat_room_id', roomId);
  }
  return roomId;
}

const Chat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomIdRef = useRef<string>(getOrCreateRoomId());
  const lastTimestampRef = useRef<string>('');
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOpenRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Join room & load history
  const joinRoom = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: roomIdRef.current,
          guestName: `Khách #${roomIdRef.current.slice(5, 11)}`,
        }),
      });
      const data = await res.json();

      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
        lastTimestampRef.current = data.messages[data.messages.length - 1].timestamp;
      }
      setHasJoined(true);
    } catch (error) {
      console.error('[Chat] Join room error:', error);
    }
  }, []);

  // Poll for new messages
  const pollNewMessages = useCallback(async () => {
    if (!hasJoined) return;
    try {
      const after = lastTimestampRef.current ? `?after=${encodeURIComponent(lastTimestampRef.current)}` : '';
      const res = await fetch(`${API_BASE}/chat/rooms/${roomIdRef.current}/messages/new${after}`);
      const newMsgs: Message[] = await res.json();

      if (newMsgs.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id));
          const uniqueNew = newMsgs.filter(m => !existingIds.has(m._id));
          if (uniqueNew.length === 0) return prev;
          return [...prev, ...uniqueNew];
        });
        lastTimestampRef.current = newMsgs[newMsgs.length - 1].timestamp;

        // Count unread from agent when chat is closed
        const agentMsgs = newMsgs.filter(m => m.sender === 'agent');
        if (agentMsgs.length > 0 && !isOpenRef.current) {
          setUnreadCount(prev => prev + agentMsgs.length);
        }
      }
    } catch (error) {
      // Silent fail on polling errors
    }
  }, [hasJoined]);

  // Initial join
  useEffect(() => {
    joinRoom();
  }, [joinRoom]);

  // Start/stop polling
  useEffect(() => {
    if (hasJoined) {
      pollIntervalRef.current = setInterval(pollNewMessages, 1500);
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [hasJoined, pollNewMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sending) return;

    const text = inputValue.trim();
    setInputValue('');
    setSending(true);

    // Optimistic update — hiển thị tin nhắn ngay lập tức
    const optimisticMsg: Message = {
      _id: 'temp_' + Date.now(),
      roomId: roomIdRef.current,
      text,
      sender: 'guest',
      senderName: `Khách #${roomIdRef.current.slice(5, 11)}`,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`${API_BASE}/chat/rooms/${roomIdRef.current}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sender: 'guest',
          senderName: `Khách #${roomIdRef.current.slice(5, 11)}`,
        }),
      });
      const savedMsg: Message = await res.json();

      // Replace optimistic message with server response
      setMessages(prev =>
        prev.map(m => m._id === optimisticMsg._id ? savedMsg : m)
      );
      lastTimestampRef.current = savedMsg.timestamp;
    } catch (error) {
      console.error('[Chat] Send message error:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m._id !== optimisticMsg._id));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-widget">
      <div className={`chat-window ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <div className="chat-avatar">
            <img src="https://ui-avatars.com/api/?name=Support&background=6366f1&color=fff" alt="Support" />
            <div className="chat-status"></div>
          </div>
          <div className="chat-user-info">
            <h3>Hỗ trợ viên</h3>
            <p>Trực tuyến</p>
          </div>
          <button className="chat-close-btn" onClick={toggleChat}>
            <X size={20} />
          </button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty-state">
              <MessageCircle size={40} />
              <p>Xin chào! Hãy gửi tin nhắn để bắt đầu trò chuyện.</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={msg._id || idx} className={`chat-message ${msg.sender === 'guest' ? 'sent' : 'received'}`}>
              <div className="message-bubble">{msg.text}</div>
              <span className="message-time">{formatTime(msg.timestamp)}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-container" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Nhập tin nhắn..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!inputValue.trim() || sending}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      <button className="chat-toggle-btn" onClick={toggleChat}>
        <MessageCircle size={24} />
        {!isOpen && unreadCount > 0 && (
          <span className="chat-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
    </div>
  );
};

export default Chat;
