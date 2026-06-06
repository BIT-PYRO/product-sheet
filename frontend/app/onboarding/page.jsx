'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingWizardPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [branding, setBranding] = useState({
        company_logo: '',
        primary_color: '#000000',
        secondary_color: '#FFFFFF',
        support_email: '',
        company_website: '',
        company_phone: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Fetch current onboarding progress
        fetch('/api/v1/onboarding/')
            .then(res => res.json())
            .then(data => {
                if (data.completed) {
                    router.push('/dashboard');
                } else {
                    setStep(data.step || 1);
                    if (data.branding) {
                        setBranding(data.branding);
                    }
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router]);

    const handleBrandingChange = (e) => {
        setBranding({ ...branding, [e.target.name]: e.target.value });
    };

    const nextStep = async (nextStepNum, isComplete = false) => {
        setSaving(true);
        try {
            await fetch('/api/v1/onboarding/', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: nextStepNum,
                    completed: isComplete,
                    branding: branding
                })
            });
            if (isComplete) {
                router.push('/dashboard');
            } else {
                setStep(nextStepNum);
            }
        } catch (err) {
            console.error("Failed to save progress", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
                {step === 1 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Step 1: Welcome to Miraee</h2>
                        <p className="mb-6 text-gray-600">Let's get your workspace set up.</p>
                        <button onClick={() => nextStep(2)} className="bg-indigo-600 text-white px-4 py-2 rounded">
                            Continue
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Step 2: Branding</h2>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium">Company Logo URL</label>
                                <input name="company_logo" value={branding.company_logo} onChange={handleBrandingChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Primary Color</label>
                                    <input type="color" name="primary_color" value={branding.primary_color} onChange={handleBrandingChange} className="mt-1 block w-full h-10 border border-gray-300 rounded-md p-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Secondary Color</label>
                                    <input type="color" name="secondary_color" value={branding.secondary_color} onChange={handleBrandingChange} className="mt-1 block w-full h-10 border border-gray-300 rounded-md p-1" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Support Email</label>
                                <input name="support_email" type="email" value={branding.support_email} onChange={handleBrandingChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Company Website</label>
                                <input name="company_website" type="url" value={branding.company_website} onChange={handleBrandingChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => setStep(1)} className="text-gray-600 px-4 py-2">Back</button>
                            <button onClick={() => nextStep(3)} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded">
                                {saving ? 'Saving...' : 'Next'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Step 3: Invite Team (Optional)</h2>
                        <p className="mb-6 text-gray-600">You can invite team members later from the dashboard.</p>
                        <div className="flex justify-between">
                            <button onClick={() => setStep(2)} className="text-gray-600 px-4 py-2">Back</button>
                            <button onClick={() => nextStep(4)} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded">
                                {saving ? 'Saving...' : 'Next'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Step 4: Complete Setup</h2>
                        <p className="mb-6 text-gray-600">You're all set! Click below to enter your workspace.</p>
                        <div className="flex justify-between">
                            <button onClick={() => setStep(3)} className="text-gray-600 px-4 py-2">Back</button>
                            <button onClick={() => nextStep(5, true)} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded">
                                {saving ? 'Finishing...' : 'Go to Dashboard'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
