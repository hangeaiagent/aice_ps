import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const router = express.Router();

// PayPal配置
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.paypal.com';

console.log('PayPal配置加载:', {
  clientId: PAYPAL_CLIENT_ID ? '已配置' : '未配置',
  clientSecret: PAYPAL_CLIENT_SECRET ? '已配置' : '未配置',
  apiUrl: PAYPAL_API_URL
});

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

    console.log('创建订单请求:', { plan_id, plan_code, amount, currency });

    // 获取PayPal访问令牌
    const accessToken = await getPayPalAccessToken();

    // 创建PayPal订单
    const paypalOrderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `order_${Date.now()}`,
        amount: {
          currency_code: currency,
          value: amount.toString()
        },
        description: `${plan_code} - 套餐购买`
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

    console.log('PayPal订单创建成功:', paypalResponse.data.id);

    res.json({
      paypal_order_id: paypalResponse.data.id,
      status: 'created'
    });

  } catch (error) {
    console.error('创建PayPal订单失败:', error.response?.data || error.message);
    res.status(500).json({ error: '创建订单失败', detail: error.message });
  }
});

// 捕获PayPal支付
router.post('/capture-order', async (req, res) => {
  try {
    const { order_id, plan_id } = req.body;

    console.log('捕获支付请求:', { order_id, plan_id });

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

    console.log('PayPal支付捕获结果:', captureStatus);

    if (captureStatus === 'COMPLETED') {
      res.json({
        status: 'success',
        message: '支付成功',
        capture_id: captureData.id
      });
    } else {
      res.status(400).json({ error: '支付未完成', status: captureStatus });
    }

  } catch (error) {
    console.error('捕获PayPal支付失败:', error.response?.data || error.message);
    res.status(500).json({ error: '支付处理失败', detail: error.message });
  }
});

// 创建PayPal订阅
router.post('/create-subscription', async (req, res) => {
  try {
    const { plan_id, plan_code, amount, currency = 'USD' } = req.body;

    console.log('创建订阅请求:', { plan_id, plan_code, amount, currency });

    // 获取PayPal访问令牌
    const accessToken = await getPayPalAccessToken();

    // 首先创建订阅产品
    const productData = {
      name: `${plan_code} 订阅服务`,
      description: `${plan_code} 每月订阅服务`,
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
    console.log('PayPal产品创建成功:', productId);

    // 创建订阅计划
    const planData = {
      product_id: productId,
      name: `${plan_code} 月度订阅`,
      description: `${plan_code} 每月订阅服务`,
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
    console.log('PayPal订阅计划创建成功:', subscriptionPlanId);

    // 创建订阅
    const subscriptionData = {
      plan_id: subscriptionPlanId,
      start_time: new Date(Date.now() + 60000).toISOString(), // 1分钟后开始
      subscriber: {
        name: {
          given_name: 'User',
          surname: 'Subscriber'
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

    console.log('PayPal订阅创建成功:', subscriptionResponse.data.id);

    res.json({
      paypal_subscription_id: subscriptionResponse.data.id,
      status: 'created'
    });

  } catch (error) {
    console.error('创建PayPal订阅失败:', error.response?.data || error.message);
    res.status(500).json({ error: '创建订阅失败', detail: error.message });
  }
});

// 确认订阅
router.post('/confirm-subscription', async (req, res) => {
  try {
    const { subscription_id, plan_id } = req.body;

    console.log('确认订阅请求:', { subscription_id, plan_id });

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
    console.log('PayPal订阅状态:', subscriptionData.status);

    if (subscriptionData.status === 'ACTIVE') {
      res.json({
        status: 'success',
        message: '订阅激活成功',
        subscription_id: subscription_id
      });
    } else {
      res.status(400).json({ error: '订阅未激活', status: subscriptionData.status });
    }

  } catch (error) {
    console.error('确认PayPal订阅失败:', error.response?.data || error.message);
    res.status(500).json({ error: '订阅确认失败', detail: error.message });
  }
});

// 健康检查
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Payment API is running',
    paypal_configured: !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET)
  });
});

export default router;
