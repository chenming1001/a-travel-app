// frontend/src/contexts/AuthContext.jsx - 完整修复版
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// 创建认证上下文
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 初始化检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          // 验证token有效性
          const response = await axios.get('http://localhost:8000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        }
      } catch (err) {
        console.log('验证登录状态失败:', err);
        localStorage.removeItem('access_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 注册函数 - 修复变量名冲突
  const register = async (registerData) => { // 将参数名改为 registerData
    try {
      console.log('开始注册:', registerData);
      
      // 前端验证
      const { username, email, password, full_name } = registerData;
      
      if (!username || !email || !password) {
        throw new Error('请填写所有必填字段');
      }
      
      if (password.length < 6) {
        throw new Error('密码至少需要6个字符');
      }
      
      if (username.length < 3) {
        throw new Error('用户名至少需要3个字符');
      }
      
      if (!email.includes('@') || !email.includes('.')) {
        throw new Error('请输入有效的邮箱地址');
      }

      const response = await axios.post('http://localhost:8000/api/auth/register', {
        username,
        email,
        password,
        full_name: full_name || username
      });

      console.log('注册成功:', response.data);
      
      // 保存token和用户信息 - 修复变量名
      const { access_token, user: userInfo } = response.data; // 将 userData 改为 userInfo
      localStorage.setItem('access_token', access_token);
      setUser(userInfo);
      setError(null);
      
      return { success: true, user: userInfo };
      
    } catch (error) {
      console.log('注册失败详情:', error);
      console.log('错误响应:', error.response?.data);
      
      let errorMessage = '注册失败';
      
      if (error.response?.data?.detail) {
        // 如果 detail 是数组（验证错误）
        if (Array.isArray(error.response.data.detail)) {
          // 提取错误信息
          const errors = error.response.data.detail.map(err => {
            const location = err.loc ? err.loc.join('.') : '字段';
            return `${location}: ${err.msg}`;
          }).join('; ');
          errorMessage = `注册验证失败: ${errors}`;
        } 
        // 如果 detail 是字符串
        else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('最终错误信息:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // 登录函数
  const login = async (username, password) => {
    try {
      console.log('开始登录:', username);
      
      if (!username || !password) {
        throw new Error('请填写用户名和密码');
      }

      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post('http://localhost:8000/api/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('登录成功:', response.data);
      
      const { access_token, user: userInfo } = response.data; // 也修复这里的变量名
      localStorage.setItem('access_token', access_token);
      setUser(userInfo);
      setError(null);
      
      return { success: true, user: userInfo };
      
    } catch (error) {
      console.log('登录失败:', error.response?.data || error.message);
      
      let errorMessage = '登录失败';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.status === 401) {
        errorMessage = '用户名或密码错误';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // 登出函数
  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setError(null);
  };

  // 更新用户信息
  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  // 获取认证token
  const getToken = () => {
    return localStorage.getItem('access_token');
  };

  // 刷新用户信息
  const refreshUser = async () => {
    try {
      const token = getToken();
      if (!token) {
        setUser(null);
        return;
      }

      const response = await axios.get('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(response.data);
      return response.data;
      
    } catch (error) {
      console.log('刷新用户信息失败:', error);
      logout();
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateUser,
    getToken,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
