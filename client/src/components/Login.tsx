import React from 'react';
import { User, HeadphonesIcon } from 'lucide-react';

interface LoginProps {
  onSelectRole: (role: 'guest' | 'agent') => void;
}

const Login: React.FC<LoginProps> = ({ onSelectRole }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <div className="glass-card animate-fade" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
        <h1 style={{ marginBottom: '0.5rem', fontSize: '2.5rem' }}>Xin chào!</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: '3rem' }}>Vui lòng chọn vai trò để tiếp tục trải nghiệm hệ thống.</p>
        
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
          <button
            onClick={() => onSelectRole('guest')}
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border)',
              color: 'var(--text-main)',
              padding: '2rem 1.5rem',
              borderRadius: '1rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-5px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={30} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Khách hàng</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Xem Dashboard & Chat</span>
            </div>
          </button>

          <button
            onClick={() => onSelectRole('agent')}
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border)',
              color: 'var(--text-main)',
              padding: '2rem 1.5rem',
              borderRadius: '1rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--success)';
              e.currentTarget.style.transform = 'translateY(-5px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.15)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HeadphonesIcon size={30} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>CSKH</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Quản lý & Hỗ trợ</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
