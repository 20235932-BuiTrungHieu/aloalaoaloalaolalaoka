import React, { useState, useEffect } from 'react';
import StatsGrid from './components/StatsGrid';
import TransactionTable from './components/TransactionTable';
import { transactionService } from './services/api';
import { SePayTransaction } from './types/sepay';
import { RefreshCcw, Bell } from 'lucide-react';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<SePayTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const data = await transactionService.getTransactions();
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (!isBackground) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Thiết lập tự động làm mới mỗi 10 giây (Polling)
    const interval = setInterval(() => {
      fetchData(true);
    }, 1000);

    return () => clearInterval(interval);
  }, []);


  return (
    <div className="app-container">
      <main className="main-content">
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2.5rem' 
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Dashboard</h1>
            <p style={{ color: 'var(--text-dim)' }}>Chào mừng quay trở lại, đây là lịch sử chuyển khoản từ SePay.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => fetchData()}
              disabled={refreshing}
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--border)',
                color: 'white',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <RefreshCcw size={18} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Đang cập nhật...' : 'Làm mới'}
            </button>
            
            <div style={{
              width: '45px',
              height: '45px',
              background: 'var(--glass)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              <Bell size={20} color="var(--text-dim)" />
            </div>
          </div>
        </header>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
            <div className="animate-spin" style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid var(--border)', 
              borderTopColor: 'var(--primary)', 
              borderRadius: '50%' 
            }}></div>
          </div>
        ) : (
          <>
            <StatsGrid transactions={transactions} />
            <TransactionTable 
              transactions={transactions} 
              filter={filter} 
              setFilter={setFilter} 
            />
          </>
        )}
      </main>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default App;
