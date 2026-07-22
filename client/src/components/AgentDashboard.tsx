import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LogOut, Send, Search, User as UserIcon, MessageCircle, Wifi, WifiOff } from 'lucide-react';
import socket from '../services/socket';
import './Chat.css';

interface AgentDashboardProps {
  onLogout: () => void;
}

interface ChatRoomData {
  roomId: string;
  guestName: string;
  status: string;
  lastMessage: string;
  lastMessageAt: string | Date;
  unreadByAgent: number;
  createdAt?: string | Date;
}

interface Message {
  _id?: string;
  id?: string;
  roomId: string;
  text: string;
  sender: 'guest' | 'agent';
  senderName?: string;
  timestamp: Date | string;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ onLogout }) => {
  const [rooms, setRooms] = useState<ChatRoomData[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGuestTyping, setIsGuestTyping] = useState<string | null>(null); // roomId of typing guest
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRoomRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    activeRoomRef.current = activeRoomId;
  }, [activeRoomId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Socket.IO connection
  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      console.log('[Agent] Socket connected:', socket.id);
      setConnected(true);
      socket.emit('agent:join');
    });

    socket.on('disconnect', () => {
      console.log('[Agent] Socket disconnected');
      setConnected(false);
    });

    // Nhận danh sách rooms
    socket.on('agent:rooms', (roomList: ChatRoomData[]) => {
      setRooms(roomList);
    });

    // Room mới được tạo
    socket.on('new_room', (room: ChatRoomData) => {
      setRooms(prev => {
        const exists = prev.some(r => r.roomId === room.roomId);
        if (exists) return prev;
        return [room, ...prev];
      });
    });

    // Room được cập nhật (tin nhắn mới)
    socket.on('room_updated', (updatedRoom: ChatRoomData) => {
      setRooms(prev =>
        prev.map(r =>
          r.roomId === updatedRoom.roomId ? { ...r, ...updatedRoom } : r
        ).sort((a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        )
      );
    });

    // Nhận lịch sử tin nhắn cho room đang xem
    socket.on('chat:history', (history: Message[]) => {
      setMessages(history.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })));
    });

    // Nhận tin nhắn mới
    socket.on('chat:new_message', (msg: Message) => {
      // Chỉ thêm nếu đang xem room này
      if (msg.roomId === activeRoomRef.current) {
        setMessages(prev => {
          const exists = prev.some(m =>
            (m._id && m._id === msg._id) ||
            (m.id && m.id === msg._id)
          );
          if (exists) return prev;
          return [...prev, { ...msg, timestamp: new Date(msg.timestamp) }];
        });
      }

      if (msg.sender === 'guest') {
        setIsGuestTyping(null);
      }
    });

    // Typing indicators
    socket.on('chat:typing', (data: { roomId: string; sender: string }) => {
      if (data.sender === 'guest') {
        setIsGuestTyping(data.roomId);
      }
    });

    socket.on('chat:stop_typing', (data: { roomId: string; sender: string }) => {
      if (data.sender === 'guest') {
        setIsGuestTyping(null);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('agent:rooms');
      socket.off('new_room');
      socket.off('room_updated');
      socket.off('chat:history');
      socket.off('chat:new_message');
      socket.off('chat:typing');
      socket.off('chat:stop_typing');
      socket.disconnect();
    };
  }, []);

  // Scroll khi có tin nhắn mới
  useEffect(() => {
    scrollToBottom();
  }, [messages, isGuestTyping, scrollToBottom]);

  // Chọn room
  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setMessages([]);
    socket.emit('agent:join_room', { roomId });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    if (activeRoomId) {
      socket.emit('agent:typing', { roomId: activeRoomId });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('agent:stop_typing', { roomId: activeRoomId });
      }, 1500);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !connected || !activeRoomId) return;

    socket.emit('agent:send_message', {
      roomId: activeRoomId,
      text: inputValue.trim(),
    });

    socket.emit('agent:stop_typing', { roomId: activeRoomId });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setInputValue('');
  };

  const formatTime = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 2 * oneDay) {
      return 'Hôm qua';
    } else {
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }
  };

  const formatMessageTime = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredRooms = rooms.filter(r =>
    r.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeRoom = rooms.find(r => r.roomId === activeRoomId);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: '340px',
        minWidth: '340px',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Sidebar Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '10px',
                height: '10px',
                background: connected ? 'var(--success)' : 'var(--danger)',
                borderRadius: '50%',
                boxShadow: connected ? '0 0 8px var(--success)' : 'none',
                transition: 'var(--transition)',
              }}></div>
              Hỗ trợ khách hàng
            </h2>
            <button
              onClick={() => {
                socket.disconnect();
                onLogout();
              }}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}
              title="Đăng xuất"
            >
              <LogOut size={20} />
            </button>
          </div>

          {/* Connection status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: connected ? 'var(--success)' : 'var(--danger)',
            marginBottom: '1rem',
          }}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'Đã kết nối' : 'Mất kết nối...'}
          </div>

          <div className="search-container" style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Tìm kiếm đoạn chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                className="input-glow"
              />
            </div>
          </div>
        </div>

        {/* Room List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredRooms.length === 0 && (
            <div style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              color: 'var(--text-dim)',
            }}>
              <MessageCircle size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p>{rooms.length === 0 ? 'Chưa có cuộc trò chuyện nào' : 'Không tìm thấy kết quả'}</p>
            </div>
          )}
          {filteredRooms.map(room => (
            <div
              key={room.roomId}
              onClick={() => handleSelectRoom(room.roomId)}
              style={{
                padding: '1.25rem',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                background: activeRoomId === room.roomId ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                borderLeft: activeRoomId === room.roomId ? '4px solid var(--primary)' : '4px solid transparent',
                transition: 'var(--transition)',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}
            >
              <div style={{
                width: '45px',
                height: '45px',
                minWidth: '45px',
                borderRadius: '50%',
                background: activeRoomId === room.roomId ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeRoomId === room.roomId ? 'var(--primary)' : 'var(--text-dim)',
                transition: 'var(--transition)',
              }}>
                <UserIcon size={24} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <h4 style={{ margin: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {room.guestName}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                    {formatTime(room.lastMessageAt)}
                  </span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  color: room.unreadByAgent > 0 ? 'var(--text-main)' : 'var(--text-dim)',
                  fontWeight: room.unreadByAgent > 0 ? 600 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {isGuestTyping === room.roomId ? (
                    <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>Đang gõ...</span>
                  ) : (
                    room.lastMessage || 'Chưa có tin nhắn'
                  )}
                </p>
              </div>
              {room.unreadByAgent > 0 && (
                <div style={{
                  background: 'var(--danger)',
                  color: 'white',
                  minWidth: '22px',
                  height: '22px',
                  borderRadius: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  padding: '0 6px',
                }}>
                  {room.unreadByAgent > 9 ? '9+' : room.unreadByAgent}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
        {!activeRoomId ? (
          /* Empty state — No room selected */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-dim)',
            gap: '1rem',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MessageCircle size={36} color="var(--primary)" />
            </div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem' }}>Chọn một cuộc trò chuyện</h3>
            <p style={{ fontSize: '0.9rem' }}>Chọn một khách hàng từ danh sách bên trái để bắt đầu hỗ trợ</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: '1.25rem 2rem',
              background: 'var(--bg-card)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <UserIcon size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                  {activeRoom?.guestName || 'Khách hàng'}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  color: isGuestTyping === activeRoomId ? 'var(--primary)' : 'var(--success)',
                  fontStyle: isGuestTyping === activeRoomId ? 'italic' : 'normal',
                }}>
                  {isGuestTyping === activeRoomId ? 'Đang gõ...' : 'Đang hoạt động'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {messages.length === 0 && (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dim)',
                  fontSize: '0.95rem',
                }}>
                  Chưa có tin nhắn trong cuộc trò chuyện này
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={msg._id || msg.id || idx} className={`chat-message ${msg.sender === 'agent' ? 'sent' : 'received'}`} style={{ maxWidth: '60%' }}>
                  <div className="message-bubble" style={{ fontSize: '1rem', padding: '1rem 1.25rem' }}>
                    {msg.text}
                  </div>
                  <span className="message-time">{formatMessageTime(msg.timestamp)}</span>
                </div>
              ))}
              {isGuestTyping === activeRoomId && (
                <div className="chat-message received" style={{ maxWidth: '60%' }}>
                  <div className="message-bubble typing-bubble" style={{ fontSize: '1rem', padding: '1rem 1.25rem' }}>
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

            {/* Input */}
            <div style={{ padding: '1.5rem 2rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
              <form
                onSubmit={handleSendMessage}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid var(--border)',
                  borderRadius: '2rem',
                  padding: '0.5rem 0.5rem 0.5rem 1.5rem'
                }}
              >
                <input
                  type="text"
                  placeholder={connected ? "Nhập tin nhắn hỗ trợ..." : "Đang kết nối..."}
                  value={inputValue}
                  onChange={handleInputChange}
                  disabled={!connected}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    padding: 0
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || !connected}
                  style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    background: inputValue.trim() && connected ? 'var(--primary)' : 'var(--border)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: inputValue.trim() && connected ? 'pointer' : 'not-allowed',
                    opacity: inputValue.trim() && connected ? 1 : 0.5,
                    transition: 'var(--transition)'
                  }}
                >
                  <Send size={20} style={{ marginLeft: '-2px' }} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
