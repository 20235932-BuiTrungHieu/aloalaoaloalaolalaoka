import React from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { SePayTransaction } from '../types/sepay';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  type: 'in' | 'out' | 'total';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, type }) => (
  <div className="glass-card stat-item">
    <div className={`stat-icon ${type}`}>
      {icon}
    </div>
    <div className="stat-info">
      <div className="label">{title}</div>
      <div className="value">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}</div>
    </div>
  </div>
);

interface StatsGridProps {
  transactions: SePayTransaction[];
}

const StatsGrid: React.FC<StatsGridProps> = ({ transactions }) => {
  const totalIn = transactions
    .filter(t => t.transferType === 'in')
    .reduce((sum, t) => sum + t.transferAmount, 0);

  const totalOut = transactions
    .filter(t => t.transferType === 'out')
    .reduce((sum, t) => sum + t.transferAmount, 0);

  const balance = transactions.length > 0 ? transactions[0].accumulated : 0;

  return (
    <div className="stats-grid animate-fade">
      <StatsCard 
        title="Tổng Tiền Vào" 
        value={totalIn} 
        icon={<TrendingUp size={24} />} 
        type="in" 
      />
      <StatsCard 
        title="Tổng Tiền Ra" 
        value={totalOut} 
        icon={<TrendingDown size={24} />} 
        type="out" 
      />
      <StatsCard 
        title="Số Dư Hiện Tại" 
        value={balance} 
        icon={<Wallet size={24} />} 
        type="total" 
      />
    </div>
  );
};

export default StatsGrid;
