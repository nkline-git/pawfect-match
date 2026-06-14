'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Terms of Service</h1>
            <p className="text-xs text-gray-400">Last updated {updated}</p>
          </div>

          <p>
            Welcome to <strong>Pawfect Match</strong>. By creating an account or using our service,
            you agree to these Terms of Service. Please read them carefully.
          </p>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">1. What Pawfect Match Is</h2>
            <p>
              Pawfect Match is a platform that helps people discover adoptable rescue animals near
              them. We aggregate listings from independent rescue organizations and from
              RescueGroups.org. We are <strong>not</strong> a rescue organization, shelter, or
              adoption agency. All adoptions are handled directly between you and the rescue.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">2. Eligibility</h2>
            <p>
              You must be at least 13 years old to use Pawfect Match. If you are under 18, you
              may only use the service with the involvement of a parent or legal guardian.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">3. Your Account</h2>
            <p>
              You are responsible for keeping your password secure and for all activity that
              occurs under your account. Notify us immediately at{' '}
              <a href="mailto:support@pawfectmatch.app" className="text-[#e05a4e] underline">
                support@pawfectmatch.app
              </a>{' '}
              if you believe your account has been compromised.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">4. Animal Listings</h2>
            <p>
              Animal listings are provided by third-party rescue organizations. Pawfect Match does
              not verify, endorse, or guarantee the accuracy of any listing. Availability, photos,
              descriptions, and adoption fees are set by the rescue and may change at any time.
              Always contact the rescue directly to confirm a pet is still available before
              traveling or submitting an application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">5. Community Content</h2>
            <p>
              You may post content in the community section. You retain ownership of your content
              but grant Pawfect Match a non-exclusive, royalty-free license to display it within
              the service. You agree not to post content that is abusive, unlawful, or harmful
              to animals or people. We reserve the right to remove content and suspend accounts
              that violate these standards.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">6. Prohibited Conduct</h2>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Impersonating any rescue organization or individual</li>
              <li>Scraping, crawling, or automated access to the service</li>
              <li>Posting false or misleading animal listings</li>
              <li>Using the service to facilitate animal cruelty or illegal activity</li>
              <li>Attempting to gain unauthorized access to any part of the service</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">7. Disclaimer of Warranties</h2>
            <p>
              Pawfect Match is provided "as is" without warranties of any kind. We make no
              guarantees that the service will be uninterrupted, error-free, or that any
              particular animal listing will be accurate or available. Your use of the service
              is at your own risk.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Pawfect Match shall not be liable for
              any indirect, incidental, or consequential damages arising from your use of the
              service, including any issues that arise from your interaction with a rescue
              organization or adoption of an animal.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">9. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the service after
              changes constitutes your acceptance of the new Terms. We will update the "last
              updated" date at the top of this page when we make changes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the United States. Any disputes shall be
              resolved in the courts of competent jurisdiction.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-base">11. Contact</h2>
            <p>
              Questions about these Terms?{' '}
              <a href="mailto:support@pawfectmatch.app" className="text-[#e05a4e] underline">
                support@pawfectmatch.app
              </a>
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
            <Link href="/" className="hover:text-gray-600">Browse pets</Link>
          </div>

        </div>
      </div>
    </div>
  )
}
