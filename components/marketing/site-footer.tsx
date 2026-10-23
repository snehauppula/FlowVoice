// Set NEXT_PUBLIC_WHATSAPP_NUMBER (digits only, with country code) to enable the WhatsApp link.
export function SiteFooter() {
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const text = encodeURIComponent("Hi FlowSite AI, I'd like to know more about FlowVoice, your AI voice calling platform. Could we talk about how it fits my business?");
  return (
    <footer className="border-t border-border px-4 py-8 text-center text-muted">
      <p>
        FlowVoice. Built by <strong className="text-foreground">FlowSite AI</strong>.
      </p>
      {number && (
        <p className="mt-1">
          <a className="underline" href={`https://wa.me/${number}?text=${text}`} target="_blank" rel="noopener noreferrer">
            Chat with us on WhatsApp
          </a>
        </p>
      )}
    </footer>
  );
}
