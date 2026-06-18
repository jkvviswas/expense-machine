import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from '../../components/primitives/BrandMark';

const EASE = [0.22, 1, 0.36, 1] as const;

function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const nav = useNavigate();
  return (
    <div className="em-grain min-h-screen bg-ground text-bright">
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-[68px] max-w-3xl items-center justify-between px-6">
          <button type="button" onClick={() => nav('/welcome')} aria-label="Home">
            <BrandMark size={28} />
          </button>
          <button
            type="button"
            onClick={() => nav(-1)}
            className="flex items-center gap-2 text-[0.84rem] text-muted transition-colors hover:text-bright"
          >
            <ArrowLeft size={15} /> Back
          </button>
        </div>
      </header>
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mx-auto max-w-3xl px-6 py-16"
      >
        <p className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-brass">Expense Machine</p>
        <h1 className="font-serif text-[2.4rem] leading-tight text-bright">{title}</h1>
        <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">Last updated {updated}</p>
        <div className="mt-10 flex flex-col gap-7">{children}</div>
        <p className="mt-14 border-t border-hairline pt-6 text-center font-mono text-[0.66rem] tracking-[0.06em] text-faint">
          © {new Date().getFullYear()} Expense Machine™. All rights reserved.
        </p>
      </motion.main>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 font-serif text-[1.3rem] text-bright">{heading}</h2>
      <div className="flex flex-col gap-3 text-[0.95rem] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="June 2026">
      <p className="text-[0.95rem] leading-relaxed text-soft">
        Expense Machine is built around a simple principle: your financial information is yours.
        This policy explains what we store, why, and the choices you have.
      </p>
      <Section heading="What we store">
        <p>
          When you create an account, we store your name, the username and email address you provide,
          and a securely hashed version of your password. We never store your password in a readable form,
          and no one — including us — can see it.
        </p>
        <p>
          Your financial data (transactions, accounts, balances, budgets and related records) is used only
          to run the app for you. We do not sell it, share it, or use it to train anything.
        </p>
      </Section>
      <Section heading="How your data is protected">
        <p>
          Accounts are managed through a secure authentication provider. Where your data is stored in the cloud,
          access is restricted by per-user security rules so that one account can never read another account's data.
        </p>
      </Section>
      <Section heading="What we never do">
        <p>We do not sell your data. We do not share it with advertisers. We do not display ads.</p>
      </Section>
      <Section heading="Your choices">
        <p>
          You can edit your profile, export or clear your data, and delete your account at any time. If you
          delete your account, the associated data is removed.
        </p>
      </Section>
      <Section heading="Contact">
        <p>
          For any privacy question or request, contact the account owner of this deployment. As the service grows,
          a dedicated contact address will be provided here.
        </p>
      </Section>
      <p className="text-[0.82rem] italic text-faint">
        This document is a plain-language summary provided for transparency. It is not legal advice. For a
        commercial launch, have it reviewed against the data-protection laws that apply to you.
      </p>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Use" updated="June 2026">
      <p className="text-[0.95rem] leading-relaxed text-soft">
        These terms govern your use of Expense Machine. By creating an account or using the app, you agree to them.
      </p>
      <Section heading="Using the service">
        <p>
          Expense Machine is a tool to help you organise and understand your own finances. You are responsible
          for the accuracy of the information you enter and for keeping your login credentials secure.
        </p>
      </Section>
      <Section heading="Not financial advice">
        <p>
          Expense Machine helps you see and reconcile your money. It does not provide financial, tax, legal, or
          investment advice. Decisions you make based on the information shown are your own.
        </p>
      </Section>
      <Section heading="Acceptable use">
        <p>
          Do not misuse the service, attempt to access other users' data, disrupt the service, or use it for any
          unlawful purpose. We may suspend accounts that do.
        </p>
      </Section>
      <Section heading="Availability">
        <p>
          We aim to keep the service running smoothly but provide it on an "as is" basis, without guarantees of
          uninterrupted availability. Features may change as the product evolves.
        </p>
      </Section>
      <Section heading="Intellectual property">
        <p>
          The Expense Machine name, logo, design, and software are the property of their owner and are protected by
          copyright. You may not copy, resell, or redistribute the application without permission.
        </p>
      </Section>
      <Section heading="Changes to these terms">
        <p>
          These terms may be updated as the product develops. Continued use after an update constitutes acceptance
          of the revised terms.
        </p>
      </Section>
      <p className="text-[0.82rem] italic text-faint">
        This document is a plain-language summary provided for transparency. It is not legal advice. For a
        commercial launch, have it reviewed by a qualified professional.
      </p>
    </LegalShell>
  );
}
