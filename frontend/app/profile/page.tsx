"use client";

import { useEffect, useState } from "react";

interface AuthUser {
  id: number;
  email: string;
  postcode: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("elvakt_user");
    if (!storedUser) return;

    try {
      const user = JSON.parse(storedUser) as AuthUser;
      setCurrentUser(user);
    } catch {
      localStorage.removeItem("elvakt_user");
    }
  }, []);

  return (
    <main className="min-h-screen text-[#111111]">
      <div className="mx-auto max-w-5xl px-6 pb-12 md:pb-20">
        <header className="mb-16 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500">
            ElVakt Profile
          </p>
          <h1 className="mt-4 text-4xl font-light text-gray-900 md:text-5xl">
            Your account
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-gray-600 md:text-base">
            This is your personal ElVakt space. Over time this area can grow into
            alerts, saved places and premium features.
          </p>
        </header>

        {currentUser ? (
          <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
            <div className="space-y-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Email
                </p>
                <p className="mt-2 text-lg text-gray-900">{currentUser.email}</p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Default postcode
                </p>
                <p className="mt-2 text-lg text-gray-900">
                  {currentUser.postcode}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Plan
                </p>
                <p className="mt-2 text-lg text-gray-900">Free</p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Email verification
                </p>
                <p className="mt-2 text-lg text-gray-900">
                  {currentUser.is_verified ? "Verified" : "Pending"}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="text-lg text-gray-700">You are not logged in yet.</p>
          </section>
        )}
      </div>
    </main>
  );
}
