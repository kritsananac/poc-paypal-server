require('dotenv').config();

const { randomUUID } = require('node:crypto');
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('pino-http');

const { Client, OrdersController } = require('@paypal/paypal-server-sdk');

const config = require('./config');

const app = express();
const PORT = 3000;
const CURRENCY_CODE = 'THB';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(logger());

const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: config.PAYPAL_CLIENT_ID,
    oAuthClientSecret: config.PAYPAL_CLIENT_SECRET
  },
  environment: config.PAYPAL_ENVIRONMENT,
  // timeout: 0,
  // logging: {
  //   logLevel: LogLevel.Info,
  //   logRequest: {
  //     logBody: true
  //   },
  //   logResponse: {
  //     logHeaders: true
  //   }
  // },
});

const ordersController = new OrdersController(client);

// Home Route
app.get('/', (req, res) => {
  res.send('PayPal Payment Gateway');
});

// Create Payment Route
app.get('/checkout/orders', (req, res) => {

  const invoiceId = randomUUID();
  console.info('invoiceId: ' + invoiceId);
  const createCheckoutOrderฺBody = {
    "intent": "CAPTURE",
    "paymentSource": {
      "paypal": {
        "experienceContext": {
          "paymentMethodPreference": "IMMEDIATE_PAYMENT_REQUIRED",
          "landingPage": "LOGIN",
          "shippingPreference": "GET_FROM_FILE",
          "userAction": "PAY_NOW",
          "returnUrl": "http://localhost:3000/success",
          "cancelUrl": "http://localhost:3000/cancel"
        }
      }
    },
    "purchaseUnits": [
      {
        "invoiceId": invoiceId,
        "amount": {
          "currencyCode": CURRENCY_CODE,
          "value": "230.00",
          "breakdown": {
            "itemTotal": {
              "currencyCode": CURRENCY_CODE,
              "value": "220.00"
            },
            "shipping": {
              "currencyCode": CURRENCY_CODE,
              "value": "10.00"
            }
          }
        },
        "items": [
          {
            "name": "T-Shirt",
            "description": "Super Fresh Shirt",
            "unitAmount": {
              "currencyCode": CURRENCY_CODE,
              "value": "20.00"
            },
            "quantity": "1",
            "category": "PHYSICAL_GOODS",
            "sku": "sku01",
            "imageUrl": "https://example.com/static/images/items/1/tshirt_green.jpg",
            "url": "https://example.com/url-to-the-item-being-purchased-1",
            "upc": {
              "type": "UPC-A",
              "code": "123456789012"
            }
          },
          {
            "name": "Shoes",
            "description": "Running, Size 10.5",
            "sku": "sku02",
            "unitAmount": {
              "currencyCode": CURRENCY_CODE,
              "value": "100.00"
            },
            "quantity": "2",
            "category": "PHYSICAL_GOODS",
            "imageUrl": "https://example.com/static/images/items/1/shoes_running.jpg",
            "url": "https://example.com/url-to-the-item-being-purchased-2",
            "upc": {
              "type": "UPC-A",
              "code": "987654321012"
            }
          }
        ]
      }
    ]
  }

  /**
   * PAYPAL DOC REF: https://developer.paypal.com/docs/api/orders/v2/#orders_create
   * Example code: https://github.com/paypal/PayPal-TypeScript-Server-SDK/blob/main/src/controllers/ordersController.ts
   */
  new OrdersController(client).ordersCreate({
    body: createCheckoutOrderฺBody,
    // paypalRequestId,
    // paypalPartnerAttributionId,
    // paypalClientMetadataId,
    // prefer,
    // paypalAuthAssertion,
  }).then(({ result }) => {
    // "result": {
    //     "id": "1VC78936LS768850D",
    //     "paymentSource": {
    //         "paypal": {}
    //     },
    //     "status": "PAYER_ACTION_REQUIRED",
    //     "links": [
    //         {
    //             "href": "https://api.sandbox.paypal.com/v2/checkout/orders/1VC78936LS768850D",
    //             "rel": "self",
    //             "method": "GET"
    //         },
    //         {
    //             "href": "https://www.sandbox.paypal.com/checkoutnow?token=1VC78936LS768850D",
    //             "rel": "payer-action",
    //             "method": "GET"
    //         }
    //     ]
    // }

    console.log(result);

    for (let link of result.links) {
      if (link.rel === 'payer-action') {
        return res.redirect(link.href);
      }
    }

    // res.send({ result })
  }).catch((error) => {
    console.error(error);
    res.status(500).send({ error })
  })

  // const create_payment_json = {
  //   intent: 'sale',
  //   payer: {
  //     payment_method: 'paypal',
  //   },
  //   redirect_urls: {
  //     return_url: 'http://localhost:3000/success',
  //     cancel_url: 'http://localhost:3000/cancel',
  //   },
  //   transactions: [
  //     {
  //       item_list: {
  //         items: [
  //           {
  //             name: 'Product Name',
  //             sku: '001',
  //             price: '10.00',
  //             CURRENCY_CODE: 'USD',
  //             quantity: 1,
  //           },
  //         ],
  //       },
  //       amount: {
  //         CURRENCY_CODE: 'USD',
  //         total: '10.00',
  //       },
  //       description: 'Payment for Product Name',
  //     },
  //   ],
  // };

  // paypal.payment.create(create_payment_json, (error, payment) => {
  //   if (error) {
  //     console.error(error);
  //     res.send('Error creating payment');
  //   } else {
  //     // Redirect user to PayPal for approval
  //     for (let link of payment.links) {
  //       if (link.rel === 'approval_url') {
  //         return res.redirect(link.href);
  //       }
  //     }
  //   }
  // });
});

// Success Route
// example: http://localhost:3000/success?token=2JL65376VR8428710&PayerID=T6WE5NPNJAEH8
app.get('/success', (req, res) => {
  console.log('req.headers:', req.headers);
  console.log('req.query  :', req.query);

  const token = req.query.token;
  const payerId = req.query.PayerID;

  // POST v2/checkout/orders/{orderId}/capture
  ordersController.ordersCapture({
    id: token,
  }).then(({ result }) => {
    console.log(result)
    return res.send({ message: 'Payment execution successful', result });
  }).catch((error) => {
    console.error(error);
    return res.status(500).send({ message: 'Payment execution failure', error })
  })
});

// Cancel Route
app.get('/cancel', (req, res) => {
  res.send('Payment cancelled');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
