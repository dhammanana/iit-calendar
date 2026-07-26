import React from 'react';

export function PrivacyScreen() {
  return (
    <div className="h-screen overflow-y-auto scrollbar-hide p-8 bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="max-w-2xl mx-auto prose dark:prose-invert">
        <h1 className="font-serif text-3xl font-bold mb-6 text-[var(--accent)]">Privacy Policy</h1>
        <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="font-serif text-xl font-bold mt-6 mb-3 text-[var(--text-primary)]">1. Information Collection and Use</h2>
        <p className="mb-4">
          The IIT Calendar application respects your privacy. We do not collect, store, or transmit any personally identifiable information to external servers. All data processed by this application remains on your device.
        </p>

        <h2 className="font-serif text-xl font-bold mt-6 mb-3 text-[var(--text-primary)]">2. Location Data</h2>
        <p className="mb-4">
          The application may request access to your location data (latitude and longitude) to calculate accurate sun times (dawn and solar noon) for your specific area. This location data is processed entirely locally on your device and is never sent to our servers or any third parties.
        </p>

        <h2 className="font-serif text-xl font-bold mt-6 mb-3 text-[var(--text-primary)]">3. Local Storage</h2>
        <p className="mb-4">
          The application saves your preferences, settings, and downloaded content (like study materials or chants) locally on your device using local storage mechanisms. This data is not synced to the cloud or accessible by anyone else.
        </p>

        <h2 className="font-serif text-xl font-bold mt-6 mb-3 text-[var(--text-primary)]">4. Changes to This Privacy Policy</h2>
        <p className="mb-4">
          We may update our Privacy Policy from time to time. You are advised to review this page periodically for any changes.
        </p>

        <h2 className="font-serif text-xl font-bold mt-6 mb-3 text-[var(--text-primary)]">5. Contact Us</h2>
        <p className="mb-4">
          If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us.
        </p>
      </div>
    </div>
  );
}
