const express = require('express');
const router = express.Router();
const axios = require('axios');
const { supabase } = require('../lib/supabase');

// PayPal配置
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.paypal.com';

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
router.post('/create-order', async (req, res) => {
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
router.post('/capture-order', async (req, res) => {
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

// 创建PayPal订阅
router.post('/create-subscription', async (req, res) => {
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

    // 获取PayPal访问令牌
    const accessToken = await getPayPalAccessToken();

    // 首先创建订阅产品
    const productData = {
      name: plan.plan_name,
      description: `${plan.plan_name} 订阅服务`,
      type: 'SERVICE',
      category: 'SOFTWARE'
    };

    const productResponse = await axios.post(`${PAYPAL_API_URL}/v1/catalogs/products`, productData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const productId = productResponse.data.id;

    // 创建订阅计划
    const planData = {
      product_id: productId,
      name: `${plan.plan_name} 月度订阅`,
      description: `${plan.plan_name} 每月订阅服务`,
      billing_cycles: [{
        frequency: {
          interval_unit: 'MONTH',
          interval_count: 1
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0, // 0 表示无限循环
        pricing_scheme: {
          fixed_price: {
            value: amount.toString(),
            currency_code: currency
          }
        }
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: currency
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    };

    const subscriptionPlanResponse = await axios.post(`${PAYPAL_API_URL}/v1/billing/plans`, planData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const subscriptionPlanId = subscriptionPlanResponse.data.id;

    // 创建订阅
    const subscriptionData = {
      plan_id: subscriptionPlanId,
      start_time: new Date(Date.now() + 60000).toISOString(), // 1分钟后开始
      subscriber: {
        name: {
          given_name: 'User',
          surname: user_id.toString()
        }
      },
      application_context: {
        brand_name: 'Nano Banana AI',
        locale: 'zh-CN',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: `${process.env.FRONTEND_URL || 'https://nanobanana.gitagent.io'}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://nanobanana.gitagent.io'}/payment/cancel`
      }
    };

    const subscriptionResponse = await axios.post(`${PAYPAL_API_URL}/v1/billing/subscriptions`, subscriptionData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // 创建本地订阅记录
    const { data: subscription, error: subError } = await supabase
      .from('pay_user_subscriptions')
      .insert({
        user_id,
        plan_id,
        external_subscription_id: subscriptionResponse.data.id,
        status: 'pending',
        subscription_data: subscriptionResponse.data
      })
      .select()
      .single();

    if (subError) {
      console.error('创建本地订阅失败:', subError);
    }

    res.json({
      subscription_id: subscription?.id,
      paypal_subscription_id: subscriptionResponse.data.id,
      status: 'created'
    });

  } catch (error) {
    console.error('创建PayPal订阅失败:', error.response?.data || error.message);
    res.status(500).json({ error: '创建订阅失败' });
  }
});

// 确认订阅
router.post('/confirm-subscription', async (req, res) => {
  try {
    const { subscription_id, plan_id } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ error: '用户未认证' });
    }

    // 获取PayPal访问令牌
    const accessToken = await getPayPalAccessToken();

    // 获取PayPal订阅详情
    const subscriptionResponse = await axios.get(`${PAYPAL_API_URL}/v1/billing/subscriptions/${subscription_id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const subscriptionData = subscriptionResponse.data;

    if (subscriptionData.status === 'ACTIVE') {
      // 更新本地订阅状态
      await supabase
        .from('pay_user_subscriptions')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后
          subscription_data: subscriptionData
        })
        .eq('external_subscription_id', subscription_id)
        .eq('user_id', user_id);

      // 获取套餐信息并更新积分
      const { data: plan } = await supabase
        .from('pay_subscription_plans')
        .select('*')
        .eq('id', plan_id)
        .single();

      if (plan) {
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
              available_credits: existingCredits.available_credits + plan.credits_monthly,
              monthly_quota: plan.credits_monthly,
              quota_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
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
            transaction_type: 'subscription',
            credits: plan.credits_monthly,
            description: `订阅${plan.plan_name}套餐`,
            subscription_id: subscription_id
          });
      }

      res.json({
        status: 'success',
        message: '订阅激活成功',
        subscription_id: subscription_id
      });
    } else {
      res.status(400).json({ error: '订阅未激活' });
    }

  } catch (error) {
    console.error('确认PayPal订阅失败:', error.response?.data || error.message);
    res.status(500).json({ error: '订阅确认失败' });
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

module.exports = router;
