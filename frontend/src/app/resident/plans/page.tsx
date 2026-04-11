"use client";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlansPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Dynamically load Razorpay SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handleCheckout = () => {
    setLoading(true);
    // Mocking an order creation delay
    setTimeout(() => {
       const options = {
          key: "rzp_test_mockKey123", // Mock key
          amount: 450000, // Amount in paise (₹4,500)
          currency: "INR",
          name: "MealTrace Digital",
          description: "30-Day Standard Plan",
          image: "/icon-192x192.png",
          handler: function (response: any) {
             // Success Handler
             router.push('/resident'); 
          },
          prefill: {
             name: "Harshit Agarwal",
             email: "harshit@example.com",
             contact: "9999999999"
          },
          theme: { color: "#4f46e5" }
       };

       setLoading(false);
       if (window.hasOwnProperty('Razorpay')) {
           const rzp = new (window as any).Razorpay(options);
           rzp.open();
       } else {
           alert("Razorpay SDK failed to load. Are you offline?");
       }
    }, 800);
  };

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500">
      <Link href="/resident" className="inline-flex items-center text-indigo-600 font-bold mb-6 hover:text-indigo-700 transition-colors">
         <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Top Up Plan</h1>
      <p className="text-gray-500 mb-8">Purchase meals for your account.</p>
      
      <div className="space-y-4">
         <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-200">
            <h2 className="text-xl font-bold mb-1">Standard Plan (30 Days)</h2>
            <p className="text-indigo-100 text-sm mb-6">3 meals per day (Breakfast, Lunch, Dinner)</p>
            <div className="flex justify-between items-end">
               <span className="text-3xl font-black">₹4,500</span>
               <button 
                 onClick={handleCheckout} 
                 disabled={loading}
                 className="bg-white text-indigo-600 px-6 py-2 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2 disabled:opacity-50"
               >
                 {loading ? <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"/> : <ShoppingCart className="w-4 h-4" />} Buy
               </button>
            </div>
         </div>
      </div>
    </div>
  )
}
