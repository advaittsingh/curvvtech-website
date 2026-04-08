import Razorpay from "razorpay";
import { config } from "../../config.js";

let instance: Razorpay | null = null;

export function razorpayConfigured(): boolean {
  return Boolean(config.razorpayKeyId && config.razorpayKeySecret);
}

export function getRazorpay(): Razorpay | null {
  if (!razorpayConfigured()) return null;
  if (!instance) {
    instance = new Razorpay({
      key_id: config.razorpayKeyId!,
      key_secret: config.razorpayKeySecret!,
    });
  }
  return instance;
}
