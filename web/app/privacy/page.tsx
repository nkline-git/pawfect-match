'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  const updated = 'June 13, 2026'

  return (
    <div className="min-h-dvh py-8 px-4">
      <div className="max-w-2xl mx-auto">

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-6"
        >
          <ArrowLeft size={14} />
          Back to browse
        </Link>

        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 space-y-6 text-gray-700 text-sm leading-relaxed">

          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
            <p className="text-xs text-gray-400">Last updated {updated}</p>
          </div>

          <p>
            Pawfect Match (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is committed to
            protecting your privacy. This policy explains what information we collect, how we use it,
            and your rights over it.
          </p>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">1. Information We Collect</h2>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-800">Account information</p>
                <p>
                  When you create an account we collect your email address and a hashed password.
                  You may optionally add your name, city, and a profile bio.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Pet preferences</p>
                <p>
                  If you complete our onboarding quiz we store your preferences (species, size,
                  energy level, lifestyle) so we can surface better matches.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Location (zip code only)</p>
                <p>
                  We ask for your zip code to find rescue animals near you. We do not collect
                  precise GPS coordinates. Your zip code is stored only in your browser session
                  and preferences — never shared with third parties.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Saved pets &amp; activity</p>
                <p>
                  Pets you save or like are stored in your account (Supabase database) or
                  locally in your browser&apos;s localStorage for animals sourced from
                  RescueGroups.org. This data is used only to power the Saved Pets page.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Community posts</p>
                <p>
                  Content you post in the Community section is stored in our database and
                  visible to other users of the platform.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>To create and manage your account</li>
              <li>To show you adoptable animals near you that match your preferences</li>
              <li>To power the Saved Pets and community features</li>
              <li>To send transactional emails (account confirmation, password reset)</li>
              <li>To improve the service and diagnose technical issues</li>
            </ul>
            <p>We do not sell your personal information. We do not send marketing emails.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">3. Third-Party Services</h2>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-800">Supabase</p>
                <p>
                  We use Supabase for authentication, database storage, and file storage. Your
                  account data lives on Supabase&apos;s servers.{' '}
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer"
                    className="text-[#e05a4e] underline">Supabase Privacy Policy →</a>
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800">RescueGroups.org</p>
                <p>
                  Animal listings may be fetched from RescueGroups.org&apos;s public API. We do
                  not share your personal information with RescueGroups.org.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Vercel</p>
                <p>
                  Our app is hosted on Vercel. Vercel may log request metadata (IP address,
                  browser type) for security and performance purposes.{' '}
                  <a href="https://vercel.com/legal/privacy-policy" target="_blank"
                    rel="noopener noreferrer" className="text-[#e05a4e] underline">
                    Vercel Privacy Policy →
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">4. Cookies &amp; Local Storage</h2>
            <p>
              We use a session cookie to keep you logged in. We also use your browser&apos;s
              localStorage to persist your location preferences and liked animals from
              RescueGroups.org between visits. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">5. Data Retention</h2>
            <p>
              Your account data is retained for as long as your account is active. Community posts
              and saved pets are retained until you delete them or close your account. You can
              delete your account by emailing us at{' '}
              <a href="mailto:support@pawfectmatch.app" className="text-[#e05a4e] underline">
                support@pawfectmatch.app
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">6. Children&apos;s Privacy</h2>
            <p>
              Pawfect Match is not directed at children under 13. We do not knowingly collect
              personal information from children under 13. If you believe a child under 13 has
              provided us with personal information, please contact us and we will delete it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data in a portable format</li>
            </ul>
            <p>
              To exercise any of these rights, email{' '}
              <a href="mailto:support@pawfectmatch.app" className="text-[#e05a4e] underline">
                support@pawfectmatch.app
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">8. Changes to This Policy</h2>
            <p>
              We may update this policy. Significant changes will be communicated via email or a
              notice in the app. Continued use of Pawfect Match after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">9. Contact</h2>
            <p>
              Questions about this Privacy Policy?{' '}
              <a href="mailto:support@pawfectmatch.app" className="text-[#e05a4e] underline">
                support@pawfectmatch.app
              </a>
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-gray-600">Terms of Service</Link>
            <Link href="/" className="hover:text-gray-600">Browse pets</Link>
          </div>

        </div>
      </div>
    </div>
  )
}
