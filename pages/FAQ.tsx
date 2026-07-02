import React, { useState } from "react";
import SEO from "../components/SEO";
import Icon from "../components/Icon";
import { motion, AnimatePresence } from "framer-motion";

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

const FAQPage: React.FC = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Generate Rich Snippets
  const generateSchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    };
  };

  return (
    <div className="bg-zinc-50 dark:bg-[#121212] min-h-screen font-sans pb-24">
      <SEO
        title="Frequently Asked Questions (FAQ) | Vibe Gadget"
        description="Find answers to common questions about buying AI gadgets, mobile accessories, warranty, and delivery at Vibe Gadget Bangladesh."
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSchema()) }}
      />

      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 pt-10 pb-16 px-6 text-center">
        <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          Everything you need to know about our products, billing, and support.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-8">
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="group cursor-pointer"
              onClick={() =>
                setExpandedFaq(expandedFaq === i ? null : i)
              }
            >
              <button className="w-full px-6 py-5 flex justify-between items-center text-left bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 pr-8">
                  {faq.q}
                </span>
                <div
                  className={`w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 transition-transform duration-300 ${
                    expandedFaq === i
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-none rotate-180"
                      : "text-zinc-400 group-hover:border-zinc-900 dark:group-hover:border-white"
                  }`}
                >
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
      </div>
    </div>
  );
};

export default FAQPage;
