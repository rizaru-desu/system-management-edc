import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Navigate, useNavigate } from "react-router";
import {
  LuActivity,
  LuArrowRight,
  LuCpu,
  LuEye,
  LuEyeOff,
  LuLock,
  LuMail,
  LuShieldCheck,
} from "react-icons/lu";

import { useAuth } from "~/context/AuthContext";
import type { Route } from "./+types/login";

type LoginValues = {
  email: string;
  password: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign in | EDC.OS" },
    {
      name: "description",
      content: "Access the EDC.OS operations console.",
    },
  ];
}

function fieldError(errors: unknown[]) {
  return errors.length > 0 ? String(errors[0]) : undefined;
}

export default function Login() {
  const navigate = useNavigate();
  const { user, ready, login } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "admin@edc.io",
      password: "admin123",
    } satisfies LoginValues,
    onSubmit: async ({ value }) => {
      setAuthError(null);
      await new Promise((resolve) => setTimeout(resolve, 400));

      const result = login(value.email, value.password);

      if (!result.ok) {
        setAuthError(result.error);
        return;
      }

      navigate("/app/dashboard");
    },
  });

  if (ready && user) return <Navigate to="/app/dashboard" replace />;

  return (
    <div
      className="grid min-h-screen w-full bg-[#F6F7F9] lg:grid-cols-2"
      data-testid="login-page"
    >
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0E2748] p-12 text-white lg:flex">
        <div className="grid-bg absolute inset-0 opacity-30" />
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#3F6FA8]/30 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-[400px] w-[400px] rounded-full bg-[#3F6FA8]/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 backdrop-blur">
            <LuCpu className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <span className="text-xl font-bold tracking-tight">EDC.OS</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[#DDE0EC]/70">
              Edc Lifecycle Platform
            </p>
            <h1 className="text-5xl font-bold leading-[0.95] tracking-tight xl:text-6xl">
              Run every
              <br />
              <span className="text-[#DDE0EC]">terminal,</span>
              <br />
              <span className="font-medium italic">end to end.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#DDE0EC]/70">
              Orchestrate warehouses, service points, merchants, deliveries and
              field engineers from a single operations canvas.
            </p>
          </div>

          <div className="grid max-w-md grid-cols-3 gap-4">
            {[
              { icon: LuShieldCheck, label: "PCI Aware" },
              { icon: LuActivity, label: "Real-time Ops" },
              { icon: LuCpu, label: "12k+ Terminals" },
            ].map((feature) => (
              <div
                key={feature.label}
                className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <feature.icon
                  className="mb-3 h-4 w-4 text-[#DDE0EC]"
                  strokeWidth={1.75}
                />
                <p className="text-xs leading-tight text-white/80">
                  {feature.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-[#DDE0EC]/60">
          © 2026 EDC.OS - Internal staging build
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="animate-fade-up w-full max-w-md">
          <div className="mb-10 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0E2748] text-white">
              <LuCpu className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <span className="text-lg font-bold text-[#0E2748]">EDC.OS</span>
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#3F6FA8]">
            Sign in
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-[#0E2748] sm:text-4xl">
            Welcome back, operator.
          </h2>
          <p className="mt-2 text-sm text-[#0E2748]/60">
            Enter your credentials to access the operations console.
          </p>

          <form
            className="mt-8 space-y-5"
            data-testid="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <form.Field
              name="email"
              validators={{
                onBlur: ({ value }) => {
                  if (!value) return "Work email wajib diisi.";
                  if (!emailPattern.test(value)) return "Format email belum valid.";
                  return undefined;
                },
              }}
            >
              {(field) => {
                const error = fieldError(field.state.meta.errors);

                return (
                  <div className="space-y-2">
                    <label
                      htmlFor={field.name}
                      className="text-xs font-semibold text-[#0E2748]"
                    >
                      Work Email
                    </label>
                    <div className="relative">
                      <LuMail
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3F6FA8]"
                        strokeWidth={1.75}
                      />
                      <input
                        id={field.name}
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="you@company.com"
                        className="h-11 w-full rounded-md border border-[#DDE0EC] bg-white px-3 pl-10 text-sm text-[#0E2748] outline-none transition placeholder:text-[#0E2748]/35 focus:border-[#3F6FA8] focus:ring-2 focus:ring-[#3F6FA8]/20"
                        required
                        data-testid="login-email-input"
                      />
                    </div>
                    {error ? (
                      <p className="text-xs font-medium text-red-600">{error}</p>
                    ) : null}
                  </div>
                );
              }}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onBlur: ({ value }) => {
                  if (!value) return "Password wajib diisi.";
                  if (value.length < 6) return "Password minimal 6 karakter.";
                  return undefined;
                },
              }}
            >
              {(field) => {
                const error = fieldError(field.state.meta.errors);

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={field.name}
                        className="text-xs font-semibold text-[#0E2748]"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-xs text-[#3F6FA8] transition-colors hover:text-[#0E2748]"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <LuLock
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3F6FA8]"
                        strokeWidth={1.75}
                      />
                      <input
                        id={field.name}
                        type={showPwd ? "text" : "password"}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="••••••••"
                        className="h-11 w-full rounded-md border border-[#DDE0EC] bg-white px-3 pl-10 pr-10 text-sm text-[#0E2748] outline-none transition placeholder:text-[#0E2748]/35 focus:border-[#3F6FA8] focus:ring-2 focus:ring-[#3F6FA8]/20"
                        required
                        data-testid="login-password-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3F6FA8] transition-colors hover:text-[#0E2748]"
                        data-testid="login-toggle-password"
                        aria-label={
                          showPwd ? "Hide password" : "Show password"
                        }
                      >
                        {showPwd ? (
                          <LuEyeOff className="h-4 w-4" strokeWidth={1.75} />
                        ) : (
                          <LuEye className="h-4 w-4" strokeWidth={1.75} />
                        )}
                      </button>
                    </div>
                    {error ? (
                      <p className="text-xs font-medium text-red-600">{error}</p>
                    ) : null}
                  </div>
                );
              }}
            </form.Field>

            {authError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {authError}
              </div>
            ) : null}

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="group flex h-11 w-full items-center justify-center rounded-md bg-[#0E2748] px-4 text-sm font-semibold text-white transition-all hover:bg-[#3F6FA8] disabled:cursor-not-allowed disabled:opacity-70"
                  data-testid="login-submit-button"
                >
                  {isSubmitting ? (
                    "Signing in..."
                  ) : (
                    <>
                      Continue to console
                      <LuArrowRight
                        className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        strokeWidth={2}
                      />
                    </>
                  )}
                </button>
              )}
            </form.Subscribe>
          </form>

          <div className="mt-8 rounded-xl border border-[#DDE0EC] bg-[#DDE0EC]/40 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#3F6FA8]">
              Demo credentials
            </p>
            <div className="space-y-1 font-mono text-xs text-[#0E2748]/80">
              <div>
                admin@edc.io / admin123{" "}
                <span className="text-[#3F6FA8]">(SysAdmin)</span>
              </div>
              <div>
                ops@edc.io / ops123{" "}
                <span className="text-[#3F6FA8]">(Operations)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
