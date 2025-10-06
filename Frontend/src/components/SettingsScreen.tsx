import { useState } from "react";
import { toast } from "sonner";

interface SettingsScreenProps {
  user: any;
  onUpgrade: () => void;
}

export default function SettingsScreen({ user, onUpgrade }: SettingsScreenProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    await onUpgrade();
    setIsUpgrading(false);
  };

  const handleCancelSubscription = async () => {
    // Placeholder for subscription cancellation
    toast.info("Contact support to cancel subscription");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-4">Settings</h2>
        <p className="text-white/70 text-lg">Manage your account and subscription</p>
      </div>

      <div className="space-y-8">
        {/* Subscription Management */}
        <div className="bg-[#171717] backdrop-blur-md rounded-3xl border border-[#DDAA52]/30 p-8">
          <h3 className="text-2xl font-bold text-[#FFFFFF] mb-6">Subscription</h3>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-[#FFFFFF]">Current Plan</h4>
              <p className="text-[#FFFFFF]/70">
                Free Plan - All Features Enabled
              </p>
            </div>
            <div className="px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] text-black">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>All Features Active</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#171717]/50 rounded-2xl p-6">
              <h5 className="text-[#FFFFFF] font-medium mb-2">All Features Included - Free</h5>
              <ul className="text-[#FFFFFF]/70 text-sm space-y-2">
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-[#DDAA52]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Unlimited event discovery radius</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-[#DDAA52]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Advanced filtering and sorting</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-[#DDAA52]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Personalized AI recommendations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-[#DDAA52]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Exclusive events access</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-[#DDAA52]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Early access to popular events</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-[#171717] backdrop-blur-md rounded-3xl border border-[#DDAA52]/30 p-8">
          <h3 className="text-2xl font-bold text-[#FFFFFF] mb-6">Account</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[#FFFFFF] font-medium">Email</h4>
                <p className="text-[#FFFFFF]/70 text-sm">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[#FFFFFF] font-medium">Name</h4>
                <p className="text-[#FFFFFF]/70 text-sm">{user.firstName} {user.lastName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* App Preferences */}
        <div className="bg-[#171717] backdrop-blur-md rounded-3xl border border-[#DDAA52]/30 p-8">
          <h3 className="text-2xl font-bold text-[#FFFFFF] mb-6">Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[#FFFFFF] font-medium">Push Notifications</h4>
                <p className="text-[#FFFFFF]/70 text-sm">Get notified about new events and updates</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-purple-500 bg-white/10 border-white/20 rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[#FFFFFF] font-medium">Location Services</h4>
                <p className="text-[#FFFFFF]/70 text-sm">Allow location access for nearby events</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-purple-500 bg-white/10 border-white/20 rounded"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}