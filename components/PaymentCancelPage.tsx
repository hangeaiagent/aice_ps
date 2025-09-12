/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';

interface PaymentCancelPageProps {
  onNavigateHome: () => void;
  onNavigateToPricing: () => void;
}

const PaymentCancelPage: React.FC<PaymentCancelPageProps> = ({ 
  onNavigateHome, 
  onNavigateToPricing 
}) => {
  useEffect(() => {
    // 10秒后自动跳转到首页
    const timer = setTimeout(() => {
      onNavigateHome();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onNavigateHome]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* 取消图标 */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* 标题 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          支付已取消
        </h1>

        {/* 描述 */}
        <p className="text-gray-600 mb-6">
          您已取消了支付流程。如果遇到任何问题，请联系我们的客服团队。
        </p>

        {/* 帮助信息 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-blue-900 mb-2">需要帮助？</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 检查您的PayPal账户余额</li>
            <li>• 确认支付信息是否正确</li>
            <li>• 尝试使用其他支付方式</li>
            <li>• 联系客服获取技术支持</li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={onNavigateToPricing}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            重新选择套餐
          </button>
          
          <button
            onClick={onNavigateHome}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            返回首页
          </button>
        </div>

        {/* 联系信息 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">需要帮助？</p>
          <p className="text-sm text-blue-600">
            📧 support@aiceps.com
          </p>
        </div>

        {/* 自动跳转提示 */}
        <p className="text-xs text-gray-400 mt-4">
          10秒后将自动跳转到首页
        </p>
      </div>
    </div>
  );
};

export default PaymentCancelPage;
