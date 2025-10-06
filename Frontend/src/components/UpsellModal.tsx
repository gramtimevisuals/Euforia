import { useState } from "react";

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature: string;
  benefit: string;
}

export default function UpsellModal({ isOpen, onClose, onUpgrade, feature, benefit }: UpsellModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    await onUpgrade();
    setIsUpgrading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 max-w-md mx-4">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⭐</div>
          <h3 className="text-2xl font-bold text-white mb-2">Premium Feature</h3>
          <p className="text-white/70">{feature} is a premium feature</p>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <h4 className="text-white font-semibold mb-2">With Premium you get:</h4>
          <p className="text-white/80 text-sm">{benefit}</p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 text-white py-3 px-6 rounded-xl font-medium hover:bg-white/20 transition-all border border-white/20"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
          >
            {isUpgrading ? "Upgrading..." : "Upgrade Now"}
          </button>
        </div>
      </div>
    </div>
  );
}