// components/BudgetCalculator.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calculator, DollarSign, Hotel, Train, Utensils, Ticket, 
  ShoppingBag, Download, Share2, X, CheckCircle 
} from 'lucide-react';

const BudgetCalculator = ({ isOpen, onClose, theme, planData, onCalculate }) => {
  const [budgetItems, setBudgetItems] = useState([
    { id: 1, category: '住宿', daily: 400, days: planData?.days || 3, total: 400 * (planData?.days || 3) },
    { id: 2, category: '交通', daily: 200, days: planData?.days || 3, total: 200 * (planData?.days || 3) },
    { id: 3, category: '餐饮', daily: 150, days: planData?.days || 3, total: 150 * (planData?.days || 3) },
    { id: 4, category: '门票', daily: 100, days: planData?.days || 3, total: 100 * (planData?.days || 3) }
  ]);

  const [people, setPeople] = useState(planData?.people || 2);
  const [budgetLevel, setBudgetLevel] = useState(planData?.budget || '适中');

  // 根据预算水平调整费用
  useEffect(() => {
    let multiplier = 1;
    switch (budgetLevel) {
      case '经济': multiplier = 0.7; break;
      case '适中': multiplier = 1; break;
      case '豪华': multiplier = 2; break;
      default: multiplier = 1;
    }

    const baseRates = {
      '住宿': 400,
      '交通': 200,
      '餐饮': 150,
      '门票': 100
    };

    const days = planData?.days || 3;
    const updated = budgetItems.map(item => ({
      ...item,
      daily: Math.round(baseRates[item.category] * multiplier),
      days: days,
      total: Math.round(baseRates[item.category] * multiplier * days)
    }));

    setBudgetItems(updated);
  }, [budgetLevel, planData?.days]);

  const totalBudget = budgetItems.reduce((sum, item) => sum + item.total, 0);
  const perPerson = Math.round(totalBudget / people);

  const updateItem = (id, field, value) => {
    setBudgetItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: parseInt(value) || 0 };
        if (field === 'daily' || field === 'days') {
          updated.total = updated.daily * updated.days;
        }
        return updated;
      }
      return item;
    }));
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case '住宿': return <Hotel className="w-4 h-4" />;
      case '交通': return <Train className="w-4 h-4" />;
      case '餐饮': return <Utensils className="w-4 h-4" />;
      case '门票': return <Ticket className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-2xl rounded-2xl p-6 shadow-2xl ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
        
        {/* 头部 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="w-6 h-6 text-green-500" />
              旅行预算计算器
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {planData?.destination ? `${planData.destination} • ` : ''} {planData?.days || 3}天 • {planData?.people || 2}人
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 预算水平选择 */}
        <div className="mb-6">
          <h3 className="font-bold mb-3">预算水平</h3>
          <div className="grid grid-cols-3 gap-3">
            {['经济', '适中', '豪华'].map(level => (
              <button
                key={level}
                onClick={() => setBudgetLevel(level)}
                className={`p-4 rounded-xl border flex flex-col items-center transition-all ${
                  budgetLevel === level
                    ? 'border-green-500 bg-blue-50 dark:bg-blue-900/30 text-green-600 dark:text-blue-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <DollarSign className="w-5 h-5 mb-2" />
                <span className="font-medium">{level}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 人数设置 */}
        <div className="mb-6">
          <h3 className="font-bold mb-3">出行人数</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="range"
                min="1"
                max="10"
                value={people}
                onChange={(e) => setPeople(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="w-16 text-center">
              <div className="text-2xl font-bold">{people}</div>
              <div className="text-xs text-gray-500">人</div>
            </div>
          </div>
        </div>

        {/* 详细预算项目 */}
        <div className="mb-6">
          <h3 className="font-bold mb-3">详细预算</h3>
          <div className="space-y-3">
            {budgetItems.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-yellow-500 flex items-center justify-center text-white">
                  {getCategoryIcon(item.category)}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{item.category}</span>
                    <span className="font-bold">¥{item.total.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">每日:</span>
                      <input
                        type="number"
                        min="0"
                        value={item.daily}
                        onChange={(e) => updateItem(item.id, 'daily', e.target.value)}
                        className="w-20 px-2 py-1 rounded border bg-transparent"
                      />
                      元
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">天数:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.days}
                        onChange={(e) => updateItem(item.id, 'days', e.target.value)}
                        className="w-20 px-2 py-1 rounded border bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 总计 */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">总预算</div>
              <div className="text-3xl font-bold">¥{totalBudget.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">人均预算</div>
              <div className="text-3xl font-bold">¥{perPerson.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => onCalculate && onCalculate(budgetLevel)}
            className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:opacity-90 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            应用预算
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetCalculator;
