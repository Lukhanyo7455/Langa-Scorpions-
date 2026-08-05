import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { CheckCircle2, Clock, XCircle, ArrowRight, Heart } from "lucide-react";

const MAX_ATTEMPTS = 8;
const POLL_MS = 2000;

export default function DonateSuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("checking"); // checking | paid | pending | error
  const [amount, setAmount] = useState(0);
  const attempts = useRef(0);

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    let cancelled = false;
    const tick = async () => {
      attempts.current += 1;
      try {
        const { data } = await api.get(`/public/donations/status/${sessionId}`);
        setAmount(data.amount || 0);
        if (data.payment_status === "paid") { if (!cancelled) setStatus("paid"); return; }
        if (["expired", "failed"].includes(data.payment_status)) { if (!cancelled) setStatus("error"); return; }
      } catch { /* keep trying */ }
      if (attempts.current >= MAX_ATTEMPTS) { if (!cancelled) setStatus("pending"); return; }
      setTimeout(tick, POLL_MS);
    };
    tick();
    return () => { cancelled = true; };
  }, [sessionId]);

  const config = {
    checking: { Icon: Clock, tone: "text-primary", title: "Confirming your donation…", body: "Hold tight — checking with Stripe. This usually takes a few seconds." },
    paid: { Icon: CheckCircle2, tone: "text-emerald-600", title: "Thank you — you're part of the team.", body: "Your donation has been received. A receipt is on its way from Stripe to your email." },
    pending: { Icon: Clock, tone: "text-amber-600", title: "Still confirming…", body: "Stripe is still processing. You can safely close this page — we'll email you when it's complete." },
    error: { Icon: XCircle, tone: "text-destructive", title: "We couldn't confirm your donation.", body: "If money left your account, please contact us and we'll sort it out." },
  }[status];
  const Icon = config.Icon;

  return (
    <PublicLayout>
      <section className="section-pad" data-testid="donate-success">
        <div className="container-app max-w-2xl">
          <div className="card-soft p-10 md:p-14 text-center">
            <Icon className={`w-16 h-16 mx-auto mb-6 ${config.tone}`} strokeWidth={1.5} />
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">{config.title}</h1>
            {status === "paid" && amount > 0 && (
              <div className="text-4xl font-heading font-bold text-accent mb-4">R {amount.toLocaleString()}</div>
            )}
            <p className="text-foreground/80 leading-relaxed mb-8">{config.body}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/" className="btn-primary-solid">
                <Heart className="w-4 h-4" /> Back to home
              </Link>
              <Link to="/stories" className="btn-outline-primary">
                Read athlete stories <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
