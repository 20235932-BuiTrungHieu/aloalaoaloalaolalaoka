import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LogOut, Send, Search, User as UserIcon, MessageCircle } from 'lucide-react';
import './Chat.css';

const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:5000/api');

interface AgentDashboardProps {
  onLogout: () => void;
}

interface ChatRoomData {
  roomId: string;
  guestName: string;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadByAgent: number;
  createdAt?: string;
}

interface Message {
  _id?: string;
  roomId: string;
  text: string;
  sender: 'guest' | 'agent';
  senderName?: string;
  timestamp: string;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ onLogout }) => {
  const [rooms, setRooms] = useState<ChatRoomData[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgTimestampRef = useRef<string>('');
  const activeRoomRef = useRef<string | null>(null);
  const roomPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep ref in sync
  useEffect(() => {
    activeRoomRef.current = activeRoomId;
  }, [activeRoomId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch all rooms
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/rooms`);
      const data: ChatRoomData[] = await res.json();
      setRooms(data);
      setLoading(false);
    } catch (error) {
      console.error('[Agent] Fetch rooms error:', error);
      setLoading(false);
    }
  }, []);

  // Fetch messages for active room
  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`${API_BASE}/chat/rooms/${roomId}/messages`);
      const data: Message[] = await res.json();
      setMessages(data);
      if (data.length > 0) {
        lastMsgTimestampRef.current = data[data.length - 1].timestamp;
      }
    } catch (error) {
      console.error('[Agent] Fetch messages error:', error);
    }
  }, []);

  // Poll for new messages in active room
  const pollNewMessages = useCallback(async () => {
    const roomId = activeRoomRef.current;
    if (!roomId) return;

    try {
      const after = lastMsgTimestampRef.current ? `?after=${encodeURIComponent(lastMsgTimestampRef.current)}` : '';
      const res = await fetch(`${API_BASE}/chat/rooms/${roomId}/messages/new${after}`);
      const newMsgs: Message[] = await res.json();

      if (newMsgs.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id));
          const uniqueNew = newMsgs.filter(m => !existingIds.has(m._id));
          if (uniqueNew.length === 0) return prev;
          return [...prev, ...uniqueNew];
        });
        lastMsgTimestampRef.current = newMsgs[newMsgs.length - 1].timestamp;
      }
    } catch (error) {
      // Silent fail
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Poll rooms every 2s
  useEffect(() => {
    roomPollRef.current = setInterval(fetchRooms, 2000);
    return () => {
      if (roomPollRef.current) clearInterval(roomPollRef.current);
    };
  }, [fetchRooms]);

  // Poll messages every 1.5s when a room is active
  useEffect(() => {
    if (activeRoomId) {
      msgPollRef.current = setInterval(pollNewMessages, 1500);
    }
    return () => {
      if (msgPollRef.current) clearInterval(msgPollRef.current);
    };
  }, [activeRoomId, pollNewMessages]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Select room
  const handleSelectRoom = async (roomId: string) => {
    setActiveRoomId(roomId);
    setMessages([]);
    lastMsgTimestampRef.current = '';

    // Fetch messages
    await fetchMessages(roomId);

    // Mark as read
    try {
      await fetch(`${API_BASE}/chat/rooms/${roomId}/read`, { method: 'PUT' });
      setRooms(prev =>
        prev.map(r => r.roomId === roomId ? { ...r, unreadByAgent: 0 } : r)
      );
    } catch (error) {
      // Silent
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sending || !activeRoomId) return;

    const text = inputValue.trim();
    setInputValue('');
    setSending(true);

    // Optimistic update
    const optimisticMsg: Message = {
      _id: 'temp_' + Date.now(),
      roomId: activeRoomId,
      text,
      sender: 'agent',
      senderName: 'Hỗ trợ viên',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`${API_BASE}/chat/rooms/${activeRoomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sender: 'agent',
          senderName: 'Hỗ trợ viên',
        }),
      });
      const savedMsg: Message = await res.json();

      // Replace optimistic message
      setMessages(prev =>
        prev.map(m => m._id === optimisticMsg._id ? savedMsg : m)
      );
      lastMsgTimestampRef.current = savedMsg.timestamp;

      // Update room in sidebar
      setRooms(prev =>
        prev.map(r =>
          r.roomId === activeRoomId
            ? { ...r, lastMessage: text, lastMessageAt: new Date().toISOString() }
            : r
        )
      );
    } catch (error) {
      console.error('[Agent] Send message error:', error);
      setMessages(prev => prev.filter(m => m._id !== optimisticMsg._id));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
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

  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                background: 'var(--success)',
                borderRadius: '50%',
                boxShadow: '0 0 8px var(--success)',
              }}></div>
              Hỗ trợ khách hàng
            </h2>
            <button
              onClick={onLogout}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}
              title="Đăng xuất"
            >
              <LogOut size={20} />
            </button>
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
          {loading && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              <div className="loading-spinner" style={{
                width: '30px',
                height: '30px',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem',
              }}></div>
              Đang tải...
            </div>
          )}
          {!loading && filteredRooms.length === 0 && (
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
                  {room.lastMessage || 'Chưa có tin nhắn'}
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
          /* Empty state */
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
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--success)' }}>Đang hoạt động</p>
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
                <div key={msg._id || idx} className={`chat-message ${msg.sender === 'agent' ? 'sent' : 'received'}`} style={{ maxWidth: '60%' }}>
                  <div className="message-bubble" style={{ fontSize: '1rem', padding: '1rem 1.25rem' }}>
                    {msg.text}
                  </div>
                  <span className="message-time">{formatMessageTime(msg.timestamp)}</span>
                </div>
              ))}
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
                  placeholder="Nhập tin nhắn hỗ trợ..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
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
                  disabled={!inputValue.trim() || sending}
                  style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    background: inputValue.trim() && !sending ? 'var(--primary)' : 'var(--border)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: inputValue.trim() && !sending ? 'pointer' : 'not-allowed',
                    opacity: inputValue.trim() && !sending ? 1 : 0.5,
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AgentDashboard;
