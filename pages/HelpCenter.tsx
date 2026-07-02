import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { sendTicketToTelegram } from "../services/telegram";
import { useNotify } from "../components/Notifications";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../components/Icon";
import SEO from "../components/SEO";

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const [activeTab, setActiveTab] = useState("FAQ");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    getDoc(doc(db, "settings", "platform")).then((snap) => {
      if (snap.exists()) {
        setSettings(snap.data());
      }
    });
  }, []);

  const [ticketMode, setTicketMode] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: "", message: "" });

  const faqs = [
    {
      q: "How do I track my gadget delivery?",
      a: 'You can track your order in the "Purchase History" section of your profile. Once shipped, a tracking ID will be visible.',
    },
    {
      q: "What is the warranty on Vibe products?",
      a: "Most accessories come with a 6-month replacement warranty. Gadgets like smartwatches have a 1-year brand warranty.",
    },
    {
      q: "How do I pay via bKash/Nagad?",
      a: "During checkout, select your preferred provider. You can choose to pay the delivery charge in advance or the full amount.",
    },
    {
      q: "Can I return an accessory if it doesn't fit?",
      a: "Yes, we have a 3-day return policy if the product is in its original packaging and unused.",
    },
    {
      q: "Is cash on delivery available?",
      a: "Yes, we offer COD nationwide. However, for some high-value gadgets, a small partial payment might be required.",
    },
  ];

  const contactOptions = [
    {
      label: "Customer Hotline",
      sub: "Available 10 AM to 10 PM",
      icon: <Icon name="phone-alt" className="text-xl" />,
      action: () => window.open(`tel:${settings?.customerHotline || "+8801747708843"}`),
    },
    {
      label: "WhatsApp Support",
      sub: "Instant messaging assistance",
      icon: <Icon name="whatsapp" className="text-xl" />,
      action: () => window.open(`https://wa.me/${settings?.whatsappNumber?.replace(/[^0-9]/g, '') || "8801747708843"}`),
    },
    {
      label: settings?.facebookPageName || "Vibe Gadget Facebook Page",
      sub: "Follow us for updates",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-xl w-5 h-5">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
        </svg>
      ),
      action: () => window.open(settings?.facebookPageUrl || "https://facebook.com"),
    },
  ];

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      notify("Please login to submit a ticket", "error");
      navigate("/auth-selector");
      return;
    }

    if (!ticketForm.subject || !ticketForm.message) return;

    try {
      const ticketData = {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || "User",
        userEmail: auth.currentUser.email || "No Email",
        subject: ticketForm.subject || "",
        message: ticketForm.message || "",
        status: "Open",
        createdAt: Date.now(),
      };
      await addDoc(collection(db, "helpdesk"), ticketData);
      
      await sendTicketToTelegram(ticketData);

      notify("Ticket submitted successfully", "success");
      setTicketForm({ subject: "", message: "" });
      setTicketMode(false);
    } catch (err) {
      notify("Failed to submit ticket", "error");
    }
  };

  return (
    <div className="bg-zinc-50 dark:bg-[#121212] min-h-screen font-sans pb-24">
      <SEO title="Help Center | Vibe Gadget" description="Get help and support for your orders and tech items at Vibe Gadget." />
      
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 pt-10 pb-16 px-6 text-center">
         <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-4">
           How can we help?
         </h1>
         <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base max-w-md mx-auto">
           Search our knowledge base or get in touch with our team for personalized support.
         </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-8">
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 p-2 flex mb-8">
          {["FAQ", "Contact"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 px-6 rounded-[1.5rem] text-sm font-bold transition-all duration-300 ${
                activeTab === tab
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {!ticketMode ? (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {activeTab === "FAQ" ? (
                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                  {faqs.map((faq, i) => (
                    <div
                      key={i}
                      className="group cursor-pointer"
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    >
                      <button className="w-full px-6 py-5 flex justify-between items-center text-left bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 pr-8">
                          {faq.q}
                        </span>
                        <div className={`w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 transition-transform duration-300 ${expandedFaq === i ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-none rotate-180" : "text-zinc-400 group-hover:border-zinc-900 dark:group-hover:border-white"}`}>
                          <Icon name="chevron-down" className="text-xs" />
                        </div>
                      </button>
                      <AnimatePresence>
                        {expandedFaq === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed border-t border-zinc-100 dark:border-zinc-800/50 pt-4 bg-zinc-50 dark:bg-zinc-800/20">
                              {faq.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contactOptions.map((opt, i) => (
                    <button
                      key={i}
                      onClick={opt.action}
                      className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600 transition-all flex flex-col items-start gap-4 group text-left"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900 transition-colors">
                        {typeof opt.icon === 'string' ? <Icon name={opt.icon as any} className="text-xl" /> : opt.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                          {opt.label}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1 font-semibold">
                          {opt.sub}
                        </p>
                      </div>
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setTicketMode(true)}
                    className="p-6 bg-zinc-900 dark:bg-zinc-100 rounded-[2rem] hover:opacity-90 transition-all flex flex-col items-start gap-4 group text-left border border-transparent shadow-lg"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/20 dark:bg-black/10 flex items-center justify-center text-white dark:text-zinc-900">
                      <Icon name="ticket-alt" className="text-xl" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white dark:text-zinc-900 tracking-tight">
                        Open Support Ticket
                      </h4>
                      <p className="text-xs text-white/70 dark:text-zinc-900/70 mt-1 font-semibold">
                        We reply within 24 hours
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="ticket"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 p-6 md:p-8"
            >
              <div className="flex items-center gap-4 mb-8">
                 <button onClick={() => setTicketMode(false)} className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                   <Icon name="arrow-left" className="text-sm" />
                 </button>
                 <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Submit Ticket</h2>
              </div>
              <form onSubmit={submitTicket} className="space-y-6">
                <div>
                  <label className="block text-[13px] font-bold text-zinc-500 mb-2">
                    Issue Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketForm.subject}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, subject: e.target.value })
                    }
                    className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:border-zinc-900 dark:focus:border-white outline-none transition-all text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                    placeholder="e.g. Order #1234 delivery delay"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-zinc-500 mb-2">
                    Message Detail
                  </label>
                  <textarea
                    required
                    value={ticketForm.message}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, message: e.target.value })
                    }
                    className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl h-40 focus:border-zinc-900 dark:focus:border-white outline-none transition-all text-sm font-medium text-zinc-900 dark:text-zinc-100 resize-none"
                    placeholder="Describe your issue in detail..."
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-sm tracking-wide shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HelpCenter;
