import { API_URL } from "../config.js";

let scriptPromise = null;

// Razorpay ki script ek hi baar load hoti hai
const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => {
        scriptPromise = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
};

const postJson = (path, body) =>
  fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// Result hamesha { ok, message } hota hai
export const payForOrder = async ({ orderId, user }) => {
  const loaded = await loadRazorpay();
  if (!loaded) {
    return {
      ok: false,
      message: "Could not load the payment window. Please check your internet connection.",
    };
  }

  let data;
  try {
    const res = await postJson("/api/payments/create", { orderId });
    data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || "Could not start the payment" };
  } catch {
    return { ok: false, message: "Could not reach the server. Please try again." };
  }

  return new Promise((resolve) => {
    let done = false;

    const rzp = new window.Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      name: "Caffeine",
      description: `Order #${orderId.slice(-6).toUpperCase()}`,
      order_id: data.razorpayOrderId,
      prefill: { name: user.name, email: user.email, contact: data.phone },
      theme: { color: "#8a5a36" },
      // Payment hone ke baad Razorpay yeh function chalata hai
      handler: async (response) => {
        done = true;
        try {
          const res = await postJson("/api/payments/verify", { orderId, ...response });
          const body = await res.json();
          resolve(
            res.ok
              ? { ok: true }
              : { ok: false, message: body.message || "We could not verify your payment" }
          );
        } catch {
          resolve({
            ok: false,
            message:
              "Payment went through but we could not confirm it. Please check My orders in a minute.",
          });
        }
      },
      modal: {
        ondismiss: () => {
          if (!done) {
            resolve({
              ok: false,
              message: "Payment was not completed. You can pay again from My orders.",
            });
          }
        },
      },
    });

    rzp.open();
  });
};