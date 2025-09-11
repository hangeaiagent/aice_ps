/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalButtonProps {
  planId: string;
  planCode: string;
  amount: number;
  currency?: string;
  isSubscription?: boolean;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  className?: string;
}

const PayPalButton: React.FC<PayPalButtonProps> = ({
  planId,
  planCode,
  amount,
  currency = 'USD',
  isSubscription = false,
  onSuccess,
  onError,
  onCancel,
  className = ''
}) => {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const { user } = useAuth();

  // 加载PayPal SDK
  useEffect(() => {
    const loadPayPalSDK = () => {
      if (window.paypal) {
        setSdkReady(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.VITE_PAYPAL_CLIENT_ID || 'test'}&vault=true&intent=${isSubscription ? 'subscription' : 'capture'}&currency=${currency}&locale=zh_CN`;
      script.async = true;
      script.onload = () => setSdkReady(true);
      script.onerror = () => {
        console.error('PayPal SDK failed to load');
        onError?.({ message: 'PayPal SDK 加载失败' });
      };
      document.body.appendChild(script);
    };

    loadPayPalSDK();
  }, [currency, isSubscription, onError]);

  // 渲染PayPal按钮
  useEffect(() => {
    if (sdkReady && window.paypal && paypalRef.current && !loading) {
      // 清除之前的按钮
      paypalRef.current.innerHTML = '';

      if (isSubscription) {
        // 订阅支付
        window.paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'subscribe',
            height: 40
          },
          
          createSubscription: async (data: any, actions: any) => {
            setLoading(true);
            try {
              // 调用后端API创建订阅
              const response = await fetch('/api/payments/create-subscription', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user?.access_token}`
                },
                body: JSON.stringify({
                  plan_id: planId,
                  plan_code: planCode,
                  amount: amount,
                  currency: currency
                })
              });
              
              const subscriptionData = await response.json();
              
              if (!response.ok) {
                throw new Error(subscriptionData.detail || '创建订阅失败');
              }
              
              return subscriptionData.paypal_subscription_id;
            } catch (error) {
              console.error('Create subscription error:', error);
              onError?.(error);
              setLoading(false);
              throw error;
            }
          },
          
          onApprove: async (data: any, actions: any) => {
            try {
              // 调用后端API确认订阅
              const response = await fetch('/api/payments/confirm-subscription', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user?.access_token}`
                },
                body: JSON.stringify({
                  subscription_id: data.subscriptionID,
                  plan_id: planId
                })
              });
              
              const result = await response.json();
              
              if (response.ok) {
                onSuccess?.(result);
              } else {
                throw new Error(result.detail || '订阅确认失败');
              }
            } catch (error) {
              console.error('Subscription approval error:', error);
              onError?.(error);
            } finally {
              setLoading(false);
            }
          },
          
          onCancel: () => {
            setLoading(false);
            onCancel?.();
          },
          
          onError: (err: any) => {
            console.error('PayPal subscription error:', err);
            setLoading(false);
            onError?.(err);
          }
        }).render(paypalRef.current);
      } else {
        // 一次性支付
        window.paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'paypal',
            height: 40
          },
          
          createOrder: async (data: any, actions: any) => {
            setLoading(true);
            try {
              // 调用后端API创建订单
              const response = await fetch('/api/payments/create-order', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user?.access_token}`
                },
                body: JSON.stringify({
                  plan_id: planId,
                  plan_code: planCode,
                  amount: amount,
                  currency: currency,
                  payment_type: 'one_time'
                })
              });
              
              const orderData = await response.json();
              
              if (!response.ok) {
                throw new Error(orderData.detail || '创建订单失败');
              }
              
              return orderData.paypal_order_id;
            } catch (error) {
              console.error('Create order error:', error);
              onError?.(error);
              setLoading(false);
              throw error;
            }
          },
          
          onApprove: async (data: any, actions: any) => {
            try {
              // 调用后端API捕获支付
              const response = await fetch('/api/payments/capture-order', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user?.access_token}`
                },
                body: JSON.stringify({
                  order_id: data.orderID,
                  plan_id: planId
                })
              });
              
              const result = await response.json();
              
              if (response.ok) {
                onSuccess?.(result);
              } else {
                throw new Error(result.detail || '支付确认失败');
              }
            } catch (error) {
              console.error('Payment capture error:', error);
              onError?.(error);
            } finally {
              setLoading(false);
            }
          },
          
          onCancel: () => {
            setLoading(false);
            onCancel?.();
          },
          
          onError: (err: any) => {
            console.error('PayPal payment error:', err);
            setLoading(false);
            onError?.(err);
          }
        }).render(paypalRef.current);
      }
    }
  }, [sdkReady, loading, planId, planCode, amount, currency, isSubscription, user, onSuccess, onError, onCancel]);

  if (!sdkReady) {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-400">加载支付组件...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <span className="ml-2 text-white">处理中...</span>
        </div>
      )}
      <div ref={paypalRef} className="relative"></div>
    </div>
  );
};

export default PayPalButton;
