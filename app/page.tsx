"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

const COUNTRY_CODES = [
  { label: "+1 (Canada/USA)", value: "+1" },
  { label: "+44 (UK)", value: "+44" },
  { label: "+91 (India)", value: "+91" },
  { label: "+92 (Pakistan)", value: "+92" },
  { label: "+971 (UAE)", value: "+971" },
  { label: "+974 (Qatar)", value: "+974" },
  { label: "+966 (Saudi Arabia)", value: "+966" },
  { label: "+965 (Kuwait)", value: "+965" },
  { label: "+968 (Oman)", value: "+968" },
  { label: "+973 (Bahrain)", value: "+973" },
  { label: "+60 (Malaysia)", value: "+60" },
  { label: "+61 (Australia)", value: "+61" },
  { label: "+64 (New Zealand)", value: "+64" },
  { label: "+27 (South Africa)", value: "+27" },
  { label: "+255 (Tanzania)", value: "+255" },
  { label: "+254 (Kenya)", value: "+254" },
  { label: "+49 (Germany)", value: "+49" },
  { label: "+33 (France)", value: "+33" },
];

export default function HomePage() {
  const router = useRouter();
  const [itsId, setItsId] = useState("");
  const [headName, setHeadName] = useState("");
  const [lastName, setLastName] = useState("");
  const [memberCount, setMemberCount] = useState("1");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAlreadyRegistered(false);
    setLoading(true);

    const phone = phoneNumber.trim()
      ? `${countryCode}${phoneNumber.trim()}`
      : undefined;

    try {
      const res = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itsId: itsId.trim(),
          headName: headName.trim(),
          lastName: lastName.trim(),
          memberCount: parseInt(memberCount, 10) || 1,
          email: email.trim(),
          phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.alreadyRegistered) {
          setAlreadyRegistered(true);
        }
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
            New here? Register your family below. Already registered?{" "}
            <Link href="/signin" className="text-emerald-600 hover:underline font-medium">
              Sign in to edit your RSVP
            </Link>
            .
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Family Details</CardTitle>
            <CardDescription>
              Fill in your details to create a new RSVP. Already registered?{" "}
              <Link href="/signin" className="text-emerald-600 hover:underline font-medium">
                Sign in here
              </Link>
              .
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
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. ahmed@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">
                  Phone Number{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-12 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="e.g. 5550101"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-12 text-base flex-1"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                  {alreadyRegistered && (
                    <span>
                      {" "}
                      <Link href="/signin" className="underline font-medium">
                        Sign in here
                      </Link>
                      .
                    </span>
                  )}
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
