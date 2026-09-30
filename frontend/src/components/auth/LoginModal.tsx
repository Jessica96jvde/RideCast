"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock, User, X, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, username: string) => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: LoginModalProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login({ username, password });
      if (res.success) {
        onLoginSuccess(res.token, res.username);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your officer credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#1f2329] border-2 border-[#AF4B47] rounded-3xl p-6 sm:p-8 shadow-2xl text-[#EDDECB]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#B5C3C4] hover:text-[#EDDECB] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#F3B763]/20 border border-[#F3B763]/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#F3B763]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#EDDECB]">
              Authority Login
            </h3>
            <p className="text-xs text-[#B5C3C4] font-medium mt-0.5">
              Skip the Crowd. Plan Your Ride.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-[#AF4B47]/20 border border-[#AF4B47]/40 flex items-start gap-2.5 text-xs text-[#EDDECB] font-medium">
            <AlertCircle className="w-4 h-4 text-[#AF4B47] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-[#EDDECB] mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-[#B5C3C4]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[#191c22] border-2 border-[#6B8D8A]/40 focus:border-[#AF4B47] text-sm text-[#EDDECB] font-bold placeholder-[#B5C3C4]/40 focus:outline-none focus:ring-2 focus:ring-[#AF4B47]/30"
                placeholder="e.g. admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-[#EDDECB] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#B5C3C4]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[#191c22] border-2 border-[#6B8D8A]/40 focus:border-[#AF4B47] text-sm text-[#EDDECB] font-bold placeholder-[#B5C3C4]/40 focus:outline-none focus:ring-2 focus:ring-[#AF4B47]/30"
                placeholder="Enter password"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#AF4B47]/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "LOGIN"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
