// Centralized configuration for the application
// All environment-dependent values should be accessed through this module

const CONFIG = {
  // WhatsApp configuration
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || "919675159675",

  // App configuration
  appName: "The Rose by Geetanjli",
  appUrl: "https://the-rose-delta.vercel.app",

  // Tax configuration
  gstRate: 0.05, // 5% GST

  // Delivery configuration
  deliveryCity: "Faridabad",
  freeDeliveryThreshold: 0, // Free delivery for all orders
};

export default CONFIG;
