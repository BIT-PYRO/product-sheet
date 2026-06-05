import * as Dialog from '@radix-ui/react-dialog';
import { X, Lock, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useEntitlements } from '@/contexts/EntitlementContext';

export function UpgradeModal({ feature, isOpen, onClose }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { planName } = useEntitlements();

  async function handleUpgradeRequest() {
    setIsSubmitting(true);
    try {
      await fetch('/api/upgrade-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_code: feature?.feature_code })
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!feature) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl">
          <div className="absolute right-4 top-4">
            <Dialog.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          
          <div className="flex flex-col items-center text-center space-y-4 pt-4">
            <div className="h-12 w-12 rounded-full bg-trust-blue/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-trust-blue" />
            </div>
            
            <div className="space-y-2">
              <Dialog.Title className="text-xl font-bold tracking-tight">
                Unlock {feature.name}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                This feature is available on the <strong>{feature.min_plan_name || 'Premium'}</strong> plan. 
                Your current plan is <strong>{planName}</strong>.
              </Dialog.Description>
            </div>

            <div className="bg-muted/50 w-full p-4 rounded-xl text-left">
              <h4 className="font-medium flex items-center gap-2 mb-2 text-sm">
                <Sparkles className="w-4 h-4 text-trust-blue" />
                Feature Benefits
              </h4>
              <p className="text-sm text-muted-foreground">{feature.description || 'Gain access to advanced capabilities to grow your business.'}</p>
            </div>

            {success ? (
              <div className="w-full bg-success/10 text-success-dark font-medium p-3 rounded-lg text-sm border border-success/20">
                Request sent! Our team will contact you shortly.
              </div>
            ) : (
              <div className="w-full flex gap-3 pt-2">
                <Dialog.Close asChild>
                  <button className="flex-1 py-2.5 px-4 rounded-lg font-medium text-sm border hover:bg-muted transition-colors">
                    Maybe Later
                  </button>
                </Dialog.Close>
                <button 
                  onClick={handleUpgradeRequest}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-lg font-medium text-sm bg-trust-blue text-white hover:bg-trust-blue-hover transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Requesting...' : 'Request Upgrade'}
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
