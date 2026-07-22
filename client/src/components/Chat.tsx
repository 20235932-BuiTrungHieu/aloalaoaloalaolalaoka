import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Wifi, WifiOff } from 'lucide-react';
import socket from '../services/socket';
import './Chat.css';

interface Message {
  _id?: string;
  id?: string;
  roomId: string;
  text: string;
  sender: 'guest' | 'agent';
  senderName?: string;
  timestamp: Date | string;
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
  const [connected, setConnected] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomIdRef = useRef<string>(getOrCreateRoomId());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasJoinedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Kết nối Socket.IO
  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      console.log('[Chat] Socket connected:', socket.id);
      setConnected(true);

      // Join room ngay khi kết nối
      socket.emit('guest:join', {
        roomId: roomIdRef.current,
        guestName: `Khách #${roomIdRef.current.slice(5, 11)}`,
      });
      hasJoinedRef.current = true;
    });

    socket.on('disconnect', () => {
      console.log('[Chat] Socket disconnected');
      setConnected(false);
    });

    // Nhận lịch sử tin nhắn
    socket.on('chat:history', (history: Message[]) => {
      setMessages(history.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })));
    });

    // Nhận tin nhắn mới
    socket.on('chat:new_message', (msg: Message) => {
      if (msg.roomId !== roomIdRef.current) return;

      setMessages(prev => {
        // Tránh duplicate
        const exists = prev.some(m =>
          (m._id && m._id === msg._id) ||
          (m.id && m.id === msg._id)
        );
        if (exists) return prev;
        return [...prev, { ...msg, timestamp: new Date(msg.timestamp) }];
      });

      // Nếu tin nhắn từ agent và chat đang đóng, tăng unread
      if (msg.sender === 'agent') {
        setIsAgentTyping(false);
      }
    });

    // Typing indicator
    socket.on('chat:typing', (data: { roomId: string; sender: string }) => {
      if (data.roomId === roomIdRef.current && data.sender === 'agent') {
        setIsAgentTyping(true);
      }
    });

    socket.on('chat:stop_typing', (data: { roomId: string; sender: string }) => {
      if (data.roomId === roomIdRef.current && data.sender === 'agent') {
        setIsAgentTyping(false);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('chat:history');
      socket.off('chat:new_message');
      socket.off('chat:typing');
      socket.off('chat:stop_typing');
      socket.disconnect();
    };
  }, []);

  // Scroll to bottom khi có tin nhắn mới hoặc mở chat
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isAgentTyping, scrollToBottom]);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === 'agent') {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages.length]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Emit typing indicator
    socket.emit('guest:typing', { roomId: roomIdRef.current });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('guest:stop_typing', { roomId: roomIdRef.current });
    }, 1500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !connected) return;

    // Emit to server (server sẽ broadcast lại bao gồm cả sender)
    socket.emit('guest:send_message', {
      roomId: roomIdRef.current,
      text: inputValue.trim(),
      senderName: `Khách #${roomIdRef.current.slice(5, 11)}`,
    });

    // Stop typing
    socket.emit('guest:stop_typing', { roomId: roomIdRef.current });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setInputValue('');
  };

  const formatTime = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-widget">
      <div className={`chat-window ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <div className="chat-avatar">
            <img src="https://ui-avatars.com/api/?name=Support&background=6366f1&color=fff" alt="Support" />
            <div className={`chat-status ${connected ? '' : 'offline'}`}></div>
          </div>
          <div className="chat-user-info">
            <h3>Hỗ trợ viên</h3>
            <p className="connection-status">
              {connected ? (
                <><Wifi size={12} style={{ marginRight: 4 }} /> Trực tuyến</>
              ) : (
                <><WifiOff size={12} style={{ marginRight: 4 }} /> Đang kết nối...</>
              )}
            </p>
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
            <div key={msg._id || msg.id || idx} className={`chat-message ${msg.sender === 'guest' ? 'sent' : 'received'}`}>
              <div className="message-bubble">{msg.text}</div>
              <span className="message-time">{formatTime(msg.timestamp)}</span>
            </div>
          ))}
          {isAgentTyping && (
            <div className="chat-message received">
              <div className="message-bubble typing-bubble">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-container" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder={connected ? "Nhập tin nhắn..." : "Đang kết nối..."}
            value={inputValue}
            onChange={handleInputChange}
            disabled={!connected}
          />
          <button 
            type="submit" 
            className="chat-send-btn"
            disabled={!inputValue.trim() || !connected}
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
