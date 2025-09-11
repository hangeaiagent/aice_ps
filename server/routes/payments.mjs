import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const router = express.Router();

// Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PayPal配置
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.paypal.com';

// 简单的认证中间件
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '缺少认证令牌' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: '无效的认证令牌' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('认证失败:', error);
    res.status(401).json({ error: '认证失败' });
  }
};

// 获取PayPal访问令牌
async function getPayPalAccessToken() {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post(`${PAYPAL_API_URL}/v1/oauth2/token`, 
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error('获取PayPal访问令牌失败:', error.response?.data || error.message);
    throw new Error('PayPal认证失败');
  }
}

// 创建PayPal订单（一次性支付）
router.post('/create-order', authenticateUser, async (req, res) => {
  try {
    const { plan_id, plan_code, amount, currency = 'USD' } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ error: '用户未认证' });
    }

    // 获取套餐信息
    const { data: plan, error: planError } = await supabase
      .from('pay_subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: '套餐不存在' });
    }

    // 创建本地订单记录
    const { data: order, error: orderError } = await supabase
      .from('pay_payment_orders')
      .insert({
        user_id,
        plan_id,
        amount: parseFloat(amount),
        currency,
        payment_method: 'paypal',
        payment_status: 'pending',
        payment_type: 'one_time',
        order_data: {
          plan_code,
          plan_name: plan.plan_name
        }
      })
      .select()
      .single();

    if (orderError) {
      console.error('创建本地订单失败:', orderError);
      return res.status(500).json({ error: '创建订单失败' });
    }

    // 获取PayPal访问令牌
    const accessToken = await getPayPalAccessToken();

    // 创建PayPal订单
    const paypalOrderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: order.id.toString(),
        amount: {
          currency_code: currency,
          value: amount.toString()
        },
        description: `${plan.plan_name} - ${plan_code}`
      }],
      application_context: {
        brand_name: 'Nano Banana AI',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.FRONTEND_URL || 'https://nanobanana.gitagent.io'}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://nanobanana.gitagent.io'}/payment/cancel`
      }
    };

    const paypalResponse = await axios.post(`${PAYPAL_API_URL}/v2/checkout/orders`, paypalOrderData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // 更新本地订单记录
    await supabase
      .from('pay_payment_orders')
      .update({
        external_order_id: paypalResponse.data.id,
        payment_data: paypalResponse.data
      })
      .eq('id', order.id);

    res.json({
      order_id: order.id,
      paypal_order_id: paypalResponse.data.id,
      status: 'created'
    });

  } catch (error) {
    console.error('创建PayPal订单失败:', error.response?.data || error.message);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// 捕获PayPal支付
router.post('/capture-order', authenticateUser, async (req, res) => {
  try {
    const { order_id, plan_id } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ error: '用户未认证' });
    }

    // 获取本地订单
    const { data: localOrder, error: orderError } = await supabase
      .from('pay_payment_orders')
      .select('*')
      .eq('external_order_id', order_id)
      .eq('user_id', user_id)
      .single();

    if (orderError || !localOrder) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 获取PayPal访问令牌
    const accessToken = await getPayPalAccessToken();

    // 捕获PayPal支付
    const captureResponse = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders/${order_id}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const captureData = captureResponse.data;
    const captureStatus = captureData.status;

    if (captureStatus === 'COMPLETED') {
      // 更新订单状态
      await supabase
        .from('pay_payment_orders')
        .update({
          payment_status: 'completed',
          completed_at: new Date().toISOString(),
          payment_data: captureData
        })
        .eq('id', localOrder.id);

      // 获取套餐信息
      const { data: plan } = await supabase
        .from('pay_subscription_plans')
        .select('*')
        .eq('id', plan_id)
        .single();

      if (plan) {
        // 创建用户订阅记录（买断版）
        if (plan.plan_code === 'lifetime') {
          await supabase
            .from('pay_user_subscriptions')
            .insert({
              user_id,
              plan_id,
              status: 'active',
              started_at: new Date().toISOString(),
              // 买断版设置为100年后过期
              expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
            });
        }

        // 更新用户积分
        const { data: existingCredits } = await supabase
          .from('pay_user_credits')
          .select('*')
          .eq('user_id', user_id)
          .single();

        if (existingCredits) {
          await supabase
            .from('pay_user_credits')
            .update({
              total_credits: existingCredits.total_credits + plan.credits_monthly,
              available_credits: existingCredits.available_credits + plan.credits_monthly
            })
            .eq('user_id', user_id);
        } else {
          await supabase
            .from('pay_user_credits')
            .insert({
              user_id,
              total_credits: plan.credits_monthly,
              available_credits: plan.credits_monthly,
              used_credits: 0,
              monthly_quota: plan.credits_monthly,
              quota_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
        }

        // 记录积分交易
        await supabase
          .from('pay_credit_transactions')
          .insert({
            user_id,
            transaction_type: 'purchase',
            credits: plan.credits_monthly,
            description: `购买${plan.plan_name}套餐`,
            order_id: localOrder.id
          });
      }

      res.json({
        status: 'success',
        message: '支付成功',
        order_id: localOrder.id,
        capture_id: captureData.id
      });
    } else {
      // 更新订单状态为失败
      await supabase
        .from('pay_payment_orders')
        .update({
          payment_status: 'failed',
          payment_data: captureData
        })
        .eq('id', localOrder.id);

      res.status(400).json({ error: '支付未完成' });
    }

  } catch (error) {
    console.error('捕获PayPal支付失败:', error.response?.data || error.message);
    res.status(500).json({ error: '支付处理失败' });
  }
});

// PayPal Webhook处理
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    console.log('PayPal Webhook事件:', event.event_type);

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // 订阅激活
        await handleSubscriptionActivated(event);
        break;
      
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        // 订阅取消
        await handleSubscriptionCancelled(event);
        break;
      
      case 'PAYMENT.SALE.COMPLETED':
        // 支付完成
        await handlePaymentCompleted(event);
        break;
      
      default:
        console.log('未处理的Webhook事件:', event.event_type);
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('处理PayPal Webhook失败:', error);
    res.status(500).json({ error: 'Webhook处理失败' });
  }
});

// 处理订阅激活
async function handleSubscriptionActivated(event) {
  const subscriptionId = event.resource.id;
  
  await supabase
    .from('pay_user_subscriptions')
    .update({
      status: 'active',
      webhook_data: event
    })
    .eq('external_subscription_id', subscriptionId);
}

// 处理订阅取消
async function handleSubscriptionCancelled(event) {
  const subscriptionId = event.resource.id;
  
  await supabase
    .from('pay_user_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      webhook_data: event
    })
    .eq('external_subscription_id', subscriptionId);
}

// 处理支付完成
async function handlePaymentCompleted(event) {
  // 处理支付完成逻辑
  console.log('支付完成:', event.resource);
}

export default router;
