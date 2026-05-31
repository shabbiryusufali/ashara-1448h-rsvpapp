"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  const router = useRouter();
  const [itsId, setItsId] = useState("");
  const [headName, setHeadName] = useState("");
  const [lastName, setLastName] = useState("");
  const [memberCount, setMemberCount] = useState("1");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itsId: itsId.trim(),
          headName: headName.trim(),
          lastName: lastName.trim(),
          memberCount: parseInt(memberCount, 10) || 1,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      router.push(`/rsvp/${data.editToken}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ashara 1448H RSVP
          </h1>
          <p className="text-gray-600">
            Enter your details to register or access your RSVP.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Family Details</CardTitle>
            <CardDescription>
              First time? We&apos;ll create your record. Returning?
              We&apos;ll pull up your existing RSVP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="itsId">ITS ID</Label>
                <Input
                  id="itsId"
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 10000001"
                  value={itsId}
                  onChange={(e) => setItsId(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headName">Head of Family Name</Label>
                <Input
                  id="headName"
                  type="text"
                  placeholder="e.g. Ahmed"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="e.g. Yusufali"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="memberCount">Number of Family Members</Label>
                <Input
                  id="memberCount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="e.g. 4"
                  value={memberCount}
                  onChange={(e) => setMemberCount(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. ahmed@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. 555-0101"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading}
              >
                {loading ? "Please wait..." : "Continue →"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          If you need assistance, please contact the event committee.
        </p>
      </div>
    </main>
  );
}
