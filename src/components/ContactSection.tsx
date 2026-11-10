"use client";

import { useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import type ReCAPTCHAInstance from "react-google-recaptcha";
import emailjs from "@emailjs/browser";
import { Send, Mail, Linkedin, LoaderCircle, Info } from "lucide-react";
import SectionHeading from "./SectionHeading";

const ReCAPTCHA = dynamic(() => import("./CaptchaWidget"), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground">Loading verification…</p>,
});

// Browser-safe provider identifiers; never put server secrets in NEXT_PUBLIC_ variables.
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

const isContactConfigured = Boolean(
  EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY && RECAPTCHA_SITE_KEY
);

export default function ContactSection({
  contactEmail,
  linkedinUrl,
}: {
  contactEmail: string;
  linkedinUrl?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const captchaRef = useRef<ReCAPTCHAInstance>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isContactConfigured) {
      setStatus({
        error: true,
        text: `The contact form is not configured for web dispatch. Please write directly to ${contactEmail}.`,
      });
      return;
    }
    if (sending || !formRef.current) return;
    if (!captcha) {
      setStatus({ error: true, text: "Please complete the verification before sending." });
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      await emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, formRef.current, {
        publicKey: EMAILJS_PUBLIC_KEY,
      });
      formRef.current.reset();
      setStatus({
        error: false,
        text: "Message sent! Thank you for reaching out. I’ll get back to you soon.",
      });
    } catch {
      setStatus({
        error: true,
        text: `Your message could not be sent. Please try again or email ${contactEmail}.`,
      });
    } finally {
      setSending(false);
      setCaptcha(null);
      captchaRef.current?.reset();
    }
  }

  return (
    <section id="contact" className="py-20 md:py-24 relative">
      <div className="container mx-auto px-6">
        <SectionHeading>contact</SectionHeading>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          <div>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              I&apos;m interested in freelance opportunities and exciting projects. However, if you have other
              requests or questions, don&apos;t hesitate to reach out using the form.
            </p>
            <div className="skill-card inline-block">
              <h3 className="font-mono font-bold mb-4">Message me here</h3>
              <div className="space-y-3">
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail size={18} aria-hidden="true" />
                  Get in touch ({contactEmail})
                </a>
                {linkedinUrl && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Linkedin size={18} aria-hidden="true" />
                    LinkedIn Profile
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 min-w-0">
            {!isContactConfigured && (
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 flex items-start gap-3 text-sm text-foreground/90">
                <Info size={20} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  Direct form dispatch is currently disabled. Please reach out directly to{" "}
                  <a href={`mailto:${contactEmail}`} className="text-primary font-medium underline">
                    {contactEmail}
                  </a>
                  .
                </p>
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" aria-busy={sending}>
              <div>
                <label htmlFor="name" className="block text-sm font-mono text-muted-foreground mb-2">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={120}
                  required
                  disabled={!isContactConfigured || sending}
                  className="input-field disabled:opacity-60"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-mono text-muted-foreground mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  disabled={!isContactConfigured || sending}
                  className="input-field disabled:opacity-60"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-mono text-muted-foreground mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  maxLength={5000}
                  required
                  disabled={!isContactConfigured || sending}
                  className="input-field resize-y disabled:opacity-60"
                  placeholder="Your message…"
                />
              </div>

              {isContactConfigured && (
                <div className="captcha-container min-h-[78px]">
                  <ReCAPTCHA
                    instanceRef={captchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    theme="dark"
                    onChange={setCaptcha}
                    onExpired={() => setCaptcha(null)}
                    onErrored={() => {
                      setCaptcha(null);
                      setStatus({
                        error: true,
                        text: "Verification could not load. If testing on localhost, add localhost to your Google reCAPTCHA allowed domains, or use the email link.",
                      });
                    }}
                  />
                </div>
              )}

              <div role="status" aria-live="polite" className="text-sm leading-relaxed">
                {status && <p className={status.error ? "text-red-300" : "text-green-300"}>{status.text}</p>}
              </div>

              <button
                type="submit"
                disabled={!isContactConfigured || sending}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send size={18} aria-hidden="true" />
                )}
                {sending ? "Sending…" : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
