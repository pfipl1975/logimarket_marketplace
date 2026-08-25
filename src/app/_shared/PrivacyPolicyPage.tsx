import Link from "next/link";
import { Shield, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomePath, getPrivacyPolicyLocaleLinks, getPrivacyPolicyPath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/i18n/types";

interface PrivacyPolicyPageProps {
  locale: Locale;
}

export async function PrivacyPolicyPage({ locale }: PrivacyPolicyPageProps) {
  const dict = await getDictionary(locale);
  const homePath = getHomePath(locale);
  const privacyPath = getPrivacyPolicyPath(locale);

  const p = dict.privacy;
  const s = p.sections;

  const tocItems = [
    { id: "admin", label: s.admin.title },
    { id: "contact", label: s.contact.title },
    { id: "scope", label: s.scope.title },
    { id: "categories", label: s.categories.title },
    { id: "purposes", label: s.purposes.title },
    { id: "legal-bases-split", label: s.legalBasesSplit.title },
    { id: "legitimate-interests", label: s.legitimateInterests.title },
    { id: "recipients", label: s.recipients.title },
    { id: "transfers", label: s.transfers.title },
    { id: "retention", label: s.retention.title },
    { id: "rights", label: s.rights.title },
    { id: "complaint", label: s.complaint.title },
    { id: "voluntary", label: s.voluntary.title },
    { id: "automated-decision", label: s.automatedDecision.title },
    { id: "cookies", label: s.cookies.title },
    { id: "updates", label: s.updates.title },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <SiteHeader
        locale={locale}
        languageLinks={getPrivacyPolicyLocaleLinks()}
        navLabels={dict.nav}
        searchLabels={dict.search}
      />

      {/* Breadcrumbs bar */}
      <div className="border-b border-border bg-white py-3">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <Link href={homePath} className="transition-colors hover:text-brand-teal">
            LogiMarket
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="font-semibold text-brand-navy">{p.breadcrumbs}</span>
        </div>
      </div>

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header Banner */}
          <div className="border border-[#d9dde2] bg-white p-6 md:p-8">
            <div className="flex items-center gap-2.5 text-brand-teal">
              <Shield className="h-6 w-6" />
              <span className="text-xs font-bold uppercase tracking-wider">{p.tagline}</span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
              {p.title}
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">{p.lastUpdated}</p>
          </div>

          {/* Quick Table of Contents */}
          <div className="mt-6 border border-[#d9dde2] bg-[#f8f9fa] p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy">
              {p.tableOfContents}
            </h2>
            <nav className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs">
              {tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="text-brand-teal hover:text-brand-navy hover:underline transition-colors line-clamp-1 py-0.5"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Policy Sections */}
          <div className="mt-6 space-y-6">
            {/* 1. Admin */}
            <section id="admin" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.admin.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.admin.content}</p>
            </section>

            {/* 2. Contact */}
            <section id="contact" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.contact.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.contact.content}</p>
            </section>

            {/* 3. Scope */}
            <section id="scope" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.scope.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.scope.content}</p>
            </section>

            {/* 4. Categories */}
            <section id="categories" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.categories.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.categories.content}</p>
            </section>

            {/* 5. Purposes */}
            <section id="purposes" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.purposes.title}</h2>
              <p className="mt-3 text-sm font-medium text-brand-navy">{s.purposes.intro}</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#2c3e50]">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                  <span>{s.purposes.rfq}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                  <span>{s.purposes.checkout}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                  <span>{s.purposes.auth}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                  <span>{s.purposes.attribution}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                  <span>{s.purposes.cart}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                  <span>{s.purposes.partners}</span>
                </li>
              </ul>
            </section>

            {/* 6. Legal Bases Split */}
            <section id="legal-bases-split" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.legalBasesSplit.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.legalBasesSplit.content}</p>
            </section>

            {/* 7. Legitimate Interests */}
            <section id="legitimate-interests" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.legitimateInterests.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.legitimateInterests.content}</p>
            </section>

            {/* 8. Recipients */}
            <section id="recipients" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.recipients.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.recipients.content}</p>
            </section>

            {/* 9. Transfers */}
            <section id="transfers" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.transfers.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.transfers.content}</p>
            </section>

            {/* 10. Retention */}
            <section id="retention" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.retention.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.retention.content}</p>
            </section>

            {/* 11. Rights */}
            <section id="rights" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.rights.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.rights.content}</p>
            </section>

            {/* 12. Complaint */}
            <section id="complaint" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.complaint.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.complaint.content}</p>
            </section>

            {/* 13. Voluntary */}
            <section id="voluntary" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.voluntary.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.voluntary.content}</p>
            </section>

            {/* 14. Automated Decision */}
            <section id="automated-decision" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.automatedDecision.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.automatedDecision.content}</p>
            </section>

            {/* 15. Cookies */}
            <section id="cookies" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.cookies.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.cookies.content}</p>
            </section>

            {/* 16. Updates */}
            <section id="updates" className="scroll-mt-24 border border-[#d9dde2] bg-white p-6">
              <h2 className="text-lg font-bold text-brand-navy">{s.updates.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2c3e50]">{s.updates.content}</p>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter
        locale={locale}
        navLabels={dict.nav}
        footerLabels={dict.footer}
      />

      <CartDrawer
        cartLabels={dict.cart}
        ctaLabels={dict.cta}
        checkoutLabels={dict.checkout}
        formLabels={dict.form}
        systemLabels={dict.system}
        offerLabels={dict.offers}
        closeLabel={dict.common.close}
        privacyPolicyHref={privacyPath}
      />
    </div>
  );
}
