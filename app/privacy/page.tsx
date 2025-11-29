"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="global-bg min-h-screen px-4 pb-24 text-white lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-16">
        <header className="space-y-1 text-center md:text-left">
          <h1 className="text-3xl font-semibold text-white">Privacy Policy</h1>
          <p className="text-sm text-muted">Last updated: 11/20/2025</p>
        </header>

        {/* 1. Information We Collect */}
        <section className="rounded-3xl bg-[#080f0c] px-6 py-5">
          <h2 className="text-base font-semibold text-white">
            1. Information We Collect
          </h2>
          <p className="mt-2 text-sm text-muted">
            We collect information you provide directly to us, including your
            name, email address, username, and payment information when you
            register for tournaments or use our services.
          </p>
        </section>

        {/* 2. How We Use Your Information */}
        <section className="rounded-3xl bg-[#080f0c] px-6 py-5">
          <h2 className="text-base font-semibold text-white">
            2. How We Use Your Information
          </h2>
          <p className="mt-2 text-sm text-muted">
            We use the information we collect to:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-muted">
            <li>Provide, maintain, and improve our services</li>
            <li>Process tournament registrations and payments</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Monitor and analyze trends and usage</li>
          </ul>
        </section>

        {/* 3. Information Sharing */}
        <section className="rounded-3xl bg-[#080f0c] px-6 py-5">
          <h2 className="text-base font-semibold text-white">
            3. Information Sharing
          </h2>
          <p className="mt-2 text-sm text-muted">
            We do not share your personal information with third parties except
            as described in this policy. We may share information with service
            providers who assist us in operating our platform.
          </p>
        </section>

        {/* 4. Data Security */}
        <section className="rounded-3xl bg-[#080f0c] px-6 py-5">
          <h2 className="text-base font-semibold text-white">4. Data Security</h2>
          <p className="mt-2 text-sm text-muted">
            We take reasonable measures to protect your information from
            unauthorized access, loss, misuse, and alteration. However, no
            security system is impenetrable.
          </p>
        </section>

        {/* 5. Your Rights */}
        <section className="rounded-3xl bg-[#080f0c] px-6 py-5">
          <h2 className="text-base font-semibold text-white">5. Your Rights</h2>
          <p className="mt-2 text-sm text-muted">
            You have the right to:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-muted">
            <li>Access and update your personal information</li>
            <li>Request deletion of your account and data</li>
            <li>Opt out of marketing communications</li>
            <li>Request a copy of your data</li>
          </ul>
        </section>

        {/* 6. Cookies and Tracking */}
        <section className="rounded-3xl bg-[#080f0c] px-6 py-5">
          <h2 className="text-base font-semibold text-white">
            6. Cookies and Tracking
          </h2>
          <p className="mt-2 text-sm text-muted">
            We use cookies and similar tracking technologies to track activity
            on our service and store certain information. You can instruct your
            browser to refuse all cookies.
          </p>
        </section>

        {/* 7. Children's Privacy */}
        <section className="rounded-3xl bg-[#080f0c] px-6 py-5">
          <h2 className="text-base font-semibold text-white">
            7. Children's Privacy
          </h2>
          <p className="mt-2 text-sm text-muted">
            Our service is not intended for users under 18 years of age. We do
            not knowingly collect personal information from children under 18.
          </p>
        </section>

        {/* 8. Changes to This Policy */}
        <section className="rounded-3xl bg-[#080f0c] px-6 py-5">
          <h2 className="text-base font-semibold text-white">
            8. Changes to This Policy
          </h2>
          <p className="mt-2 text-sm text-muted">
            We may update this privacy policy from time to time. We will notify
            you of any changes by posting the new policy on this page and
            updating the "Last updated" date.
          </p>
        </section>

        {/* 9. Contact Us */}
        <section className="rounded-3xl bg-[#080f0c] px-6 py-5">
          <h2 className="text-base font-semibold text-white">9. Contact Us</h2>
          <p className="mt-2 text-sm text-muted">
            If you have any questions about this Privacy Policy, please contact
            us at:
          </p>
          <p className="mt-1 text-sm text-muted">
            Email:support@jeesports.online
            03165475717
          </p>
        </section>

        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:border-emerald-400/60"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
