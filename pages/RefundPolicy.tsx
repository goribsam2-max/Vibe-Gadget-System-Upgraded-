import React from "react";
import { useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import { ChevronLeft } from "lucide-react";

const RefundPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-12 animate-fade-in bg-zinc-50 dark:bg-zinc-800 max-w-4xl mx-auto min-h-screen">
      <SEO
        title="Refund Policy"
        description="Our strict policies around returns, refunds, and replacements."
      />
      
      <div className="space-y-8 text-sm md:text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Refund & Return Policy</h1>
          <p>Last Updated: {new Date().toLocaleDateString()}</p>
        </div>

        <section>
          <h2 className="text-black dark:text-white font-semibold text-xl mb-4">
            1. No Return / No Refund Policy
          </h2>
          <p className="font-bold text-red-600 mb-3">
            Strict No Refund / No General Return Policy.
          </p>
          <p>
            VibeGadget maintains a strict standard of inventory control. Once an order has been successfully placed, dispatched, and delivered, we do not accept general returns. We do not offer money-back guarantees or refunds simply for a change of mind. Please verify the product model, specifications, and compatibility before confirming your purchase. This strict policy ensures that all our customers receive 100% brand-new, untouched premium tech devices.
          </p>
        </section>

        <section>
          <h2 className="text-black dark:text-white font-semibold text-xl mb-4">
            2. Damaged or Defective Items on Arrival
          </h2>
          <p>
            If your product arrives visibly damaged from shipping or is dead-on-arrival (DOA) due to a verified manufacturing defect, you must capture a clear unboxing video immediately upon receiving the package. You must notify our help desk within 24 hours of delivery. Replacements will only be processed after our technical team verifies the defect and validates the unboxing evidence.
          </p>
        </section>

        <section>
          <h2 className="text-black dark:text-white font-semibold text-xl mb-4">
            3. Order Cancellations
          </h2>
          <p>
            You may cancel an order only if it has not yet been processed or dispatched by our warehouse. Please contact support immediately. Once tracking details are generated, the order is finalized and cannot be canceled or refunded.
          </p>
        </section>

        <section>
          <h2 className="text-black dark:text-white font-semibold text-xl mb-4">
            4. Warranty Claims
          </h2>
          <p>
            Products are only covered if an explicit warranty period is designated on that specific product's page. Warranty claims are strictly subject to manufacturer or brand guidelines and do not entail immediate refunds.
          </p>
        </section>
      </div>
    </div>
  );
};

export default RefundPolicy;
