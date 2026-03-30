import React from 'react';
import { Search } from 'lucide-react';
import { SePayTransaction } from '../types/sepay';

interface TransactionTableProps {
  transactions: SePayTransaction[];
  filter: string;
  setFilter: (val: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, filter, setFilter }) => {
  const filtered = transactions.filter(t => 
    t.content.toLowerCase().includes(filter.toLowerCase()) ||
    t.gateway.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="glass-card animate-fade" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Lịch Sử Giao Dịch</h2>
        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm giao dịch..." 
            className="input-glow"
            style={{ paddingLeft: '40px', width: '100%' }}
            value={filter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>THỜI GIAN</th>
              <th>NGÂN HÀNG</th>
              <th>SỐ TIỀN</th>
              <th>LOẠI</th>
              <th>NỘI DUNG</th>
              <th>MÃ THAM CHIẾU</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{t.transactionDate}</td>
                <td>
                  <div className="bank-info">
                    <span style={{ fontWeight: 500 }}>{t.gateway}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: t.transferType === 'in' ? 'var(--success)' : 'var(--danger)' }}>
                  {t.transferType === 'in' ? '+' : '-'}{new Intl.NumberFormat('vi-VN').format(t.transferAmount)}
                </td>
                <td>
                  <span className={`badge ${t.transferType}`}>
                    {t.transferType === 'in' ? 'Tiền vào' : 'Tiền ra'}
                  </span>
                </td>
                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.content}
                </td>
                <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                  {t.referenceCode}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                  Không tìm thấy giao dịch nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
