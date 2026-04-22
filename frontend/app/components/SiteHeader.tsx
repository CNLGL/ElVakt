"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "lucide-react";

interface AuthUser {
  id: number;
  email: string;
  postcode: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const storedUser = localStorage.getItem("elvakt_user");

    if (!storedUser) {
      setCurrentUser(null);
      return;
    }

    try {
      const user = JSON.parse(storedUser) as AuthUser;
      setCurrentUser(user);
    } catch {
      localStorage.removeItem("elvakt_user");
      setCurrentUser(null);
    }
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem("elvakt_user");
    setCurrentUser(null);
    window.dispatchEvent(new Event("elvakt-auth-changed"));
    router.push("/");
    router.refresh();
  }

  return (
    <header className="mx-auto mb-10 flex w-full max-w-5xl items-center justify-between px-6 pt-8 md:pt-10">
      <Link href="/" className="flex items-center gap-3">
        <h1 className="text-3xl font-extralight italic uppercase tracking-tight text-[#111111]">
          El<span className="font-bold not-italic tracking-normal">Vakt</span>
        </h1>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href="/pricing"
          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:border-gray-300"
        >
          Pricing
        </Link>

        {mounted && currentUser ? (
          <>
            <Link
              href="/profile"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:border-gray-300"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-black px-4 py-2 text-sm text-white transition hover:bg-black/85"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:border-gray-300"
          >
            <User className="h-4 w-4" />
            Login / Create account
          </Link>
        )}
      </div>
    </header>
  );
}
