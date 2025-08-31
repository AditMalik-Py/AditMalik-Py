import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());

// Supabase with service role
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// --- PayPal Auth ---
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await res.json();
  return data.access_token;
}

// --- Create PayPal Order ---
app.post("/create-paypal-order", async (req, res) => {
  const { cart, total } = req.body;
  try {
    const accessToken = await getPayPalAccessToken();
    const response = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: "USD",
            value: total.toFixed(2)
          }
        }]
      })
    });

    const order = await response.json();

    // Save order to Supabase
    await supabase.from("orders").insert([
      { paypal_order_id: order.id, items: cart, total, status: "pending" }
    ]);

    res.json(order);
  } catch (err) {
    console.error("PayPal create order error:", err);
    res.status(500).json({ error: "Failed to create PayPal order" });
  }
});

// --- PayPal Webhook ---
app.post("/paypal/webhook", async (req, res) => {
  const event = req.body;
  console.log("PayPal webhook event:", event);

  if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
    const orderId = event.resource.id;
    await supabase.from("orders").update({ status: "paid" }).eq("paypal_order_id", orderId);
  }

  res.sendStatus(200);
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));