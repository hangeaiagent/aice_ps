/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PaymentSuccessPageProps {
  onNavigateHome: () => void;
}

const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({ onNavigateHome }) => {
  const { user } = useAuth();
  const [subscriptionId, setSubscriptionId] = useState<string>('');

  useEffect(() => {
    // 从URL参数中获取订阅ID
    const urlParams = new URLSearchParams(window.location.search);
    const subId = urlParams.get('subscription_id') || urlParams.get('token');
    if (subId) {
      setSubscriptionId(subId);
    }

    // 5秒后自动跳转到首页
    const timer = setTimeout(() => {
      onNavigateHome();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onNavigateHome]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* 成功图标 */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* 标题 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          支付成功！
        </h1>

        {/* 描述 */}
        <p className="text-gray-600 mb-6">
          恭喜您！订阅已成功激活。您现在可以享受所有高级功能。
        </p>

        {/* 订阅信息 */}
        {subscriptionId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">订阅ID</p>
            <p className="text-sm font-mono text-gray-800 break-all">{subscriptionId}</p>
          </div>
        )}

        {/* 用户信息 */}
        {user && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-600 mb-1">账户</p>
            <p className="text-sm font-medium text-blue-800">{user.email}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={onNavigateHome}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            开始使用
          </button>
          
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigateToPricing'))}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            查看我的订阅
          </button>
        </div>

        {/* 自动跳转提示 */}
        <p className="text-xs text-gray-400 mt-4">
          5秒后将自动跳转到首页
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
