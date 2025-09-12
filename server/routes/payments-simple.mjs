import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 确保环境变量被加载
dotenv.config();

const router = express.Router();

// 日志函数
function log(level, message, data = null, lineInfo = null) {
  const timestamp = new Date().toISOString();
  const stack = new Error().stack;
  const caller = stack.split('\n')[2]; // 获取调用者信息
  const lineMatch = caller.match(/payments-simple\.mjs:(\d+):\d+/);
  const lineNumber = lineMatch ? lineMatch[1] : 'unknown';
  
  const logMessage = `[${timestamp}] [PAYMENTS] [${level.toUpperCase()}] [Line:${lineNumber}] ${message}`;
  console.log(logMessage);
  if (data) {
    console.log(`[${timestamp}] [PAYMENTS] [DATA] [Line:${lineNumber}]`, JSON.stringify(data, null, 2));
  }
}

const supabaseUrl = process.env.SUPABASE_URL || 'https://uobwbhvwrciaxloqdizc.supabase.co';
// 使用 service_role 密钥以获得管理员权限
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration:', { 
    supabaseUrl: !!supabaseUrl, 
    supabaseServiceKey: !!supabaseServiceKey 
  });
  throw new Error('Supabase service_role key is required for admin operations');
}

// 创建具有管理员权限的 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// PayPal 配置
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.paypal.com';
const PAYPAL_ENVIRONMENT = process.env.PAYPAL_ENVIRONMENT || 'sandbox';

log('INFO', 'PayPal配置检查', {
  hasClientId: !!PAYPAL_CLIENT_ID,
  hasClientSecret: !!PAYPAL_CLIENT_SECRET,
  apiUrl: PAYPAL_API_URL,
  environment: PAYPAL_ENVIRONMENT,
  clientIdLength: PAYPAL_CLIENT_ID?.length || 0
});

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  log('ERROR', 'PayPal配置缺失', {
    PAYPAL_CLIENT_ID: !!PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: !!PAYPAL_CLIENT_SECRET
  });
}

// 获取 PayPal 访问令牌
async function getPayPalAccessToken() {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`PayPal token request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('获取PayPal访问令牌失败:', error);
    throw error;
  }
}

// 创建订阅
router.post('/create-subscription', async (req, res) => {
  try {
    log('INFO', '收到创建订阅请求', { body: req.body, headers: req.headers });
    
    // 兼容前端参数格式：plan_id 或 planId
    const planId = req.body.planId || req.body.plan_id;
    // 从用户认证信息中获取userId，或从请求体中获取
    const userId = req.body.userId || req.body.user_id || req.headers.authorization?.split(' ')[1]; // 从token中提取
    
    log('INFO', '解析参数', { 
      originalBody: req.body,
      parsedPlanId: planId, 
      parsedUserId: userId,
      authHeader: req.headers.authorization 
    });

    if (!planId) {
      log('ERROR', '缺少订阅计划ID', { 
        planId, 
        plan_id: req.body.plan_id,
        availableFields: Object.keys(req.body)
      });
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: planId 或 plan_id 是必需的'
      });
    }

    if (!userId) {
      log('ERROR', '缺少用户ID', { 
        userId, 
        user_id: req.body.user_id,
        authHeader: req.headers.authorization,
        availableFields: Object.keys(req.body)
      });
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: userId 是必需的，请确保用户已登录'
      });
    }

    log('INFO', '开始处理订阅创建', { planId, userId });

    // 获取订阅计划信息
    log('INFO', '查询订阅计划', { planId });
    const { data: plan, error: planError } = await supabase
      .from('pay_subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      log('ERROR', '订阅计划查询失败', { planError, planId });
      return res.status(404).json({
        success: false,
        error: '订阅计划不存在'
      });
    }

    log('INFO', '订阅计划查询成功', { plan });

    // 获取 PayPal 访问令牌
    log('INFO', '获取PayPal访问令牌');
    const accessToken = await getPayPalAccessToken();
    log('INFO', 'PayPal访问令牌获取成功');

    // 获取用户信息 - 使用 Supabase Auth Admin API（推荐方式）
    const { data: { user: userInfo }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError) {
      log('WARN', '无法获取用户信息，使用默认值', { 
        error: userError.message,
        userId,
        code: userError.code 
      });
    }

    log('INFO', '用户信息', { 
      email: userInfo?.email,
      hasMetadata: !!userInfo?.user_metadata,
      userId: userInfo?.id 
    });

    // 使用 plan.id 作为 PayPal 计划 ID
    log('INFO', '使用计划ID作为PayPal计划ID', { 
      planId: plan.id,
      planCode: plan.plan_code,
      planName: plan.plan_name 
    });

    // 创建 PayPal 订阅
    const subscriptionData = {
      plan_id: plan.id, // 直接使用 pay_subscription_plans 表的 id 作为 PayPal 计划 ID
      start_time: new Date(Date.now() + 60000).toISOString(), // 1分钟后开始
      quantity: '1',
      shipping_amount: {
        currency_code: 'USD',
        value: '0.00'
      },
      subscriber: {
        name: {
          given_name: userInfo?.user_metadata?.full_name?.split(' ')[0] || 
                      userInfo?.user_metadata?.first_name || 
                      userInfo?.email?.split('@')[0] || 
                      'User',
          surname: userInfo?.user_metadata?.full_name?.split(' ')[1] || 
                   userInfo?.user_metadata?.last_name || 
                   'Customer'
        },
        email_address: userInfo?.email || 'user@example.com'
      },
      application_context: {
        brand_name: 'AicePS',
        locale: 'en-US',
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

    log('INFO', '发送PayPal订阅创建请求', { 
      url: `${PAYPAL_API_URL}/v1/billing/subscriptions`,
      subscriptionData 
    });

    const paypalResponse = await fetch(`${PAYPAL_API_URL}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'PayPal-Request-Id': `subscription-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      body: JSON.stringify(subscriptionData)
    });

    log('INFO', 'PayPal API响应状态', { 
      status: paypalResponse.status,
      statusText: paypalResponse.statusText,
      headers: Object.fromEntries(paypalResponse.headers.entries())
    });

    if (!paypalResponse.ok) {
      const errorText = await paypalResponse.text();
      log('ERROR', 'PayPal订阅创建失败', { 
        status: paypalResponse.status,
        statusText: paypalResponse.statusText,
        errorText,
        subscriptionData
      });
      return res.status(paypalResponse.status).json({
        success: false,
        error: `PayPal API错误: ${paypalResponse.status}`,
        details: errorText
      });
    }

    const subscription = await paypalResponse.json();

    // 保存订阅信息到数据库
    const { error: dbError } = await supabase
      .from('pay_user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        paypal_subscription_id: subscription.id,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('保存订阅信息失败:', dbError);
    }

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        approvalUrl: subscription.links.find(link => link.rel === 'approve')?.href
      }
    });

  } catch (error) {
    log('ERROR', '创建订阅异常@@', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取订阅计划
router.get('/plans', async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('pay_subscription_plans')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('获取订阅计划失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PayPal Webhook 处理
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    console.log('PayPal Webhook received:', event.event_type);

    // 处理不同的事件类型
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // 订阅激活
        await handleSubscriptionActivated(event.resource);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        // 订阅取消
        await handleSubscriptionCancelled(event.resource);
        break;
      case 'PAYMENT.SALE.COMPLETED':
        // 支付完成
        await handlePaymentCompleted(event.resource);
        break;
      default:
        console.log('未处理的事件类型:', event.event_type);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook处理失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 处理订阅激活
async function handleSubscriptionActivated(resource) {
  try {
    const { error } = await supabase
      .from('pay_user_subscriptions')
      .update({
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', resource.id);

    if (error) {
      console.error('更新订阅状态失败:', error);
    }
  } catch (error) {
    console.error('处理订阅激活失败:', error);
  }
}

// 处理订阅取消
async function handleSubscriptionCancelled(resource) {
  try {
    const { error } = await supabase
      .from('pay_user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', resource.id);

    if (error) {
      console.error('更新订阅状态失败:', error);
    }
  } catch (error) {
    console.error('处理订阅取消失败:', error);
  }
}

// 处理支付完成
async function handlePaymentCompleted(resource) {
  try {
    // 这里可以添加积分充值逻辑
    console.log('支付完成:', resource);
  } catch (error) {
    console.error('处理支付完成失败:', error);
  }
}

export default router;
