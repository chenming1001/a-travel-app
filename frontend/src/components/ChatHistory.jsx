// src/components/ChatHistory.jsx
import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, Trash2, CheckCircle } from 'lucide-react';

const ChatHistory = ({ onSelectSession, theme, isOpen }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const themeConfig = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-800',
      border: 'border-gray-200',
      hover: 'hover:bg-gray-50'
    },
    dark: {
      bg: 'bg-gray-800',
      text: 'text-white',
      border: 'border-gray-700',
      hover: 'hover:bg-gray-700'
    }
  }[theme];

  useEffect(() => {
    if (isOpen) {
      loadChatSessions();
    }
  }, [isOpen]);

  const loadChatSessions = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      setSessions([
        { id: '1', title: '北京旅行咨询', last_message: '故宫有什么好玩的？', updated_at: '2024-01-15 14:30', message_count: 5 },
        { id: '2', title: '成都美食推荐', last_message: '火锅店哪家好？', updated_at: '2024-01-14 10:15', message_count: 3 },
        { id: '3', title: '上海行程规划', last_message: '外滩夜景怎么样？', updated_at: '2024-01-13 16:45', message_count: 8 },
      ]);
    } catch (error) {
      console.error('加载聊天历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-64 border-l ${themeConfig.border} ${themeConfig.bg} flex flex-col`}>
      <div className="p-4 border-b ${themeConfig.border}">
        <h3 className="font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          聊天历史
        </h3>
      </div>
      
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无聊天记录</p>
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`p-3 rounded-lg mb-2 cursor-pointer ${themeConfig.hover} border ${themeConfig.border} transition-colors`}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-sm truncate">{session.title}</h4>
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                  {session.message_count}条
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                {session.last_message}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                <Clock className="w-3 h-3" />
                {session.updated_at}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatHistory;