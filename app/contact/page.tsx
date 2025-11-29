import Link from "next/link";
import { Mail, Phone, MapPin, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const info: {
    icon: any;
    label: string;
    value: string;
    href?: string;
  }[] = [
      {
        icon: Mail,
        label: "Support Email",
        value: "support@jeesports.online",
        href: "mailto:support@jeesports.online",
      },
      {
        icon: Phone,
        label: "Hotline",
        value: "+92 3165475717",
        href: "tel:+923165475717",
      },
      {
        icon: MapPin,
        label: "HQ",
        value: "Karachi, Pakistan",
      },
    ];

  return (
    <div className="global-bg min-h-screen px-4 pb-24 text-white lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 py-16">
        <div className="panel-dark rounded-3xl px-6 py-10 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">
            Contact Us
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white">
            Let’s get you into the arena
          </h1>
          <p className="mt-3 text-muted">
            Reach out for tournament partnerships, wallet assistance, or admin
            escalations. Our response time is under 2 hours on match days.
          </p>
          <div className="mt-6 inline-flex flex-wrap justify-center gap-3">
            <Link
              href="mailto:support@jeesports.gg"
              className="rounded-full bg-[#14cc6f] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#0fa75b]"
            >
              Email Support
            </Link>
            <Link
              href="tel:+923001234567"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-400/50"
            >
              Call Hotline
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {info.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="panel-dark rounded-2xl px-5 py-6">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-emerald-300" />
                <p className="text-sm uppercase tracking-[0.3em] text-muted">
                  {label}
                </p>
              </div>
              {href ? (
                <a
                  href={href}
                  className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-white transition hover:text-emerald-300"
                >
                  {value}
                </a>
              ) : (
                <p className="mt-2 text-lg font-semibold text-white">{value}</p>
              )}
            </div>
          ))}
        </div>

        <div className="panel-dark rounded-3xl px-6 py-10">
          <div className="mb-6 flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-emerald-300" />
            <div>
              <p className="text-lg font-semibold text-white">
                Send us a quick note
              </p>
              <p className="text-sm text-muted">
                We’ll respond on email and WhatsApp within 12 hours.
              </p>
            </div>
          </div>
          <form className="grid gap-4 md:grid-cols-2">
            <input
              className="panel-dark rounded-xl border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/70 md:col-span-1"
              placeholder="Full Name"
            />
            <input
              className="panel-dark rounded-xl border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/70 md:col-span-1"
              placeholder="Email or WhatsApp"
            />
            <textarea
              className="panel-dark rounded-xl border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/70 md:col-span-2"
              rows={4}
              placeholder="How can we assist you?"
            />
            <button
              type="button"
              className="rounded-full bg-[#14cc6f] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#0fa75b] md:col-span-2"
            >
              Submit Request
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted">
          Need to escalate something urgent? Ping us directly inside the app
          using the ticket center.
        </p>
      </div>
    </div>
  );
}
