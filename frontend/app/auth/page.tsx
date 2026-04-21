"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

interface AuthUser {
  id: number;
  email: string;
  postcode: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export default function AuthPage() {
  const router = useRouter();

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerPostcode, setRegisterPostcode] = useState("");

  async function handleLogin() {
    setAuthLoading(true);
    setAuthError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | AuthUser
        | { detail?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && "detail" in payload
            ? payload.detail ?? "Login basarisiz."
            : "Login basarisiz."
        );
      }

      localStorage.setItem("elvakt_user", JSON.stringify(payload));
      router.push("/");
      router.refresh();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Login sirasinda hata olustu."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister() {
    setAuthLoading(true);
    setAuthError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          confirm_password: registerConfirmPassword,
          postcode: registerPostcode,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | AuthUser
        | { detail?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && "detail" in payload
            ? payload.detail ?? "Kayit basarisiz."
            : "Kayit basarisiz."
        );
      }

      localStorage.setItem("elvakt_user", JSON.stringify(payload));
      router.push("/");
      router.refresh();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Kayit sirasinda hata olustu."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-[#111111]">
      <div className="mx-auto max-w-md px-6 pb-12 md:pb-20">
        <header className="mb-12 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500">
            ElVakt Account
          </p>
          <h1 className="mt-4 text-4xl font-light text-gray-900">
            {authMode === "login" ? "Login" : "Create account"}
          </h1>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-6 flex gap-2 rounded-full bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className={`flex-1 rounded-full px-4 py-2 text-sm ${
                authMode === "login"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
              }}
              className={`flex-1 rounded-full px-4 py-2 text-sm ${
                authMode === "register"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Create account
            </button>
          </div>

          {authMode === "login" ? (
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none"
              />
              <button
                type="button"
                onClick={handleLogin}
                disabled={authLoading}
                className="w-full rounded-2xl bg-black px-4 py-3 text-white transition hover:bg-black/85 disabled:bg-gray-400"
              >
                {authLoading ? "Loading..." : "Login"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none"
              />
              <input
                type="password"
                placeholder="Password"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={registerConfirmPassword}
                onChange={(event) =>
                  setRegisterConfirmPassword(event.target.value)
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none"
              />
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="Postcode"
                value={registerPostcode}
                onChange={(event) =>
                  setRegisterPostcode(event.target.value.replace(/\D/g, ""))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none"
              />
              <button
                type="button"
                onClick={handleRegister}
                disabled={authLoading}
                className="w-full rounded-2xl bg-black px-4 py-3 text-white transition hover:bg-black/85 disabled:bg-gray-400"
              >
                {authLoading ? "Loading..." : "Create account"}
              </button>
            </div>
          )}

          <div className="mt-4 min-h-5 text-sm text-rose-600">{authError}</div>
        </section>
      </div>
    </main>
  );
}
