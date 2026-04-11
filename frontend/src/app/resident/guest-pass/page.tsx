"use client";
import { Ticket, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GuestPass() {
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
    setTimeout(() => {
       const options = {
          key: "rzp_test_mockKey123", // Mock key
          amount: 25000, // ₹250
          currency: "INR",
          name: "MealTrace Digital",
          description: "1 Day Guest Pass",
          image: "/icon-192x192.png",
          handler: function (response: any) {
             alert('Guest pass payment success!');
             router.push('/resident'); 
          },
          prefill: {
             name: "Harshit Agarwal",
             contact: "9999999999"
          },
          theme: { color: "#4f46e5" }
       };

       setLoading(false);
       if (window.hasOwnProperty('Razorpay')) {
           const rzp = new (window as any).Razorpay(options);
           rzp.open();
       } else {
           alert("Razorpay SDK failed to load. Please check your network context.");
       }
    }, 800);
  };

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500">
      <Link href="/resident" className="inline-flex items-center text-indigo-600 font-bold mb-6 hover:text-indigo-700 transition-colors">
         <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Guest Passes</h1>
      <p className="text-gray-500 mb-8">Purchase a temporary pass for your friends or family.</p>
      
      <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-indigo-50 flex flex-col items-center">
         <div className="bg-indigo-50 p-4 rounded-full mb-4">
            <Ticket className="w-10 h-10 text-indigo-600" />
         </div>
         <h2 className="text-xl font-bold mb-2">1 Day Guest Pass</h2>
         <p className="text-center text-sm text-gray-500 mb-6">Valid for any 3 meals within 24 hours. Scans from your local vendor.</p>
         <button 
           onClick={handleCheckout}
           disabled={loading}
           className="w-full bg-indigo-600 text-white font-bold py-3 rounded-2xl shadow-indigo-500/30 shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2 disabled:opacity-50"
         >
            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Buy for ₹250"}
         </button>
      </div>
    </div>
  )
}
