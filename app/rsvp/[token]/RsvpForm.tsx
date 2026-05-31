"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Family, Meal, MealResponse } from "@/types";

interface RsvpFormProps {
  family: Family;
  meals: Meal[];
  initialResponses: MealResponse[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function RsvpForm({
  family,
  meals,
  initialResponses,
}: RsvpFormProps) {
  // attending is now a count (0 = not attending)
  const [responses, setResponses] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const r of initialResponses) {
      map.set(r.mealId, r.attending);
    }
    return map;
  });

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [submitted, setSubmitted] = useState(!!family.rsvp);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = family.editToken;

  const debouncedSave = useCallback(
    (mealId: string, count: number) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setSaveStatus("saving");
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/rsvp/${token}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mealId, count }),
          });
          if (res.ok) {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
          } else {
            setSaveStatus("error");
          }
        } catch {
          setSaveStatus("error");
        }
      }, 500);
    },
    [token]
  );

  function handleCountChange(mealId: string, count: number) {
    setResponses((prev) => new Map(prev).set(mealId, count));
    debouncedSave(mealId, count);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rsvp/${token}/submit`, {
        method: "POST",
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const days = Array.from({ length: 10 }, (_, i) => i + 1);
  const mealsByDay = (day: number, mealType: string) =>
    meals.find((m) => m.day === day && m.mealType === mealType);

  function getDayAttendingTotal(day: number): number {
    let total = 0;
    for (const mealType of ["lunch", "dinner"]) {
      const meal = mealsByDay(day, mealType);
      if (meal) total += responses.get(meal.id) ?? 0;
    }
    return total;
  }

  function getDayLabel(day: number): string {
    if (day === 10) return "Day 10 — Ashura";
    return `Day ${day}`;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {family.headName} {family.lastName} Family
            </h1>
            <p className="text-sm text-gray-500">
              ITS: {family.itsId} &middot; {family.memberCount}{" "}
              {family.memberCount === 1 ? "member" : "members"}
            </p>
          </div>
          <div className="text-right">
            {saveStatus === "saving" && (
              <Badge variant="secondary" className="text-xs">
                Saving...
              </Badge>
            )}
            {saveStatus === "saved" && (
              <Badge variant="success" className="text-xs">
                Saved ✓
              </Badge>
            )}
            {saveStatus === "error" && (
              <Badge variant="destructive" className="text-xs">
                Error saving
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {submitted && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-green-800 font-medium">
              ✓ Your RSVP has been submitted!
            </p>
            <p className="text-green-700 text-sm mt-1">
              You can continue editing your selections. Changes are saved
              automatically.{" "}
              <Link href={`/rsvp/${token}`} className="underline font-medium">
                Edit RSVP
              </Link>
            </p>
          </div>
        )}

        {/* Family Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-500">Family size</span>
              <span className="font-medium">
                {family.memberCount}{" "}
                {family.memberCount === 1 ? "member" : "members"}
              </span>
              {family.email && (
                <>
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium">{family.email}</span>
                </>
              )}
              {family.phone && (
                <>
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium">{family.phone}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
          For each meal, enter how many family members will attend (0–
          {family.memberCount}). Changes are saved automatically.
        </p>

        {/* Days Accordion */}
        <Accordion type="multiple" className="space-y-2">
          {days.map((day) => {
            const lunch = day === 10 ? undefined : mealsByDay(day, "lunch");
            const dinner = mealsByDay(day, "dinner");
            const total = getDayAttendingTotal(day);

            return (
              <AccordionItem
                key={day}
                value={`day-${day}`}
                className="bg-white rounded-lg border border-gray-200 px-4 shadow-sm"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">
                      {getDayLabel(day)}
                    </span>
                    {day === 10 && (
                      <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                        Fasting day — Dinner only
                      </Badge>
                    )}
                    {total > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {total} attending
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2 pb-1">
                    {lunch && (
                      <MealCountRow
                        meal={lunch}
                        label="Lunch"
                        count={responses.get(lunch.id) ?? 0}
                        max={family.memberCount}
                        onChange={handleCountChange}
                      />
                    )}
                    {dinner && (
                      <MealCountRow
                        meal={dinner}
                        label="Dinner"
                        count={responses.get(dinner.id) ?? 0}
                        max={family.memberCount}
                        onChange={handleCountChange}
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Submit Button */}
        <div className="pb-8">
          <Button
            onClick={handleSubmit}
            disabled={submitting || submitted}
            className="w-full h-14 text-base font-semibold"
            size="lg"
          >
            {submitting
              ? "Submitting..."
              : submitted
              ? "RSVP Submitted ✓"
              : "Submit RSVP"}
          </Button>
          {submitted && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Your RSVP is submitted. You can still edit your meal selections
              above.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

interface MealCountRowProps {
  meal: Meal;
  label: string;
  count: number;
  max: number;
  onChange: (mealId: string, count: number) => void;
}

function MealCountRow({ meal, label, count, max, onChange }: MealCountRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <span className="text-xs text-gray-400 ml-2">max {max}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(meal.id, Math.max(0, count - 1))}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          disabled={count === 0}
          aria-label="Decrease"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums">
          {count}
        </span>
        <button
          type="button"
          onClick={() => onChange(meal.id, Math.min(max, count + 1))}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          disabled={count === max}
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
}
