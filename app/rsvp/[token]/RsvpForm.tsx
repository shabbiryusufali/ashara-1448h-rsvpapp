"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [responses, setResponses] = useState<Map<string, boolean>>(() => {
    const map = new Map<string, boolean>();
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
    (mealId: string, attending: boolean) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setSaveStatus("saving");
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/rsvp/${token}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mealId, attending }),
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

  function handleCheck(mealId: string, checked: boolean) {
    setResponses((prev) => new Map(prev).set(mealId, checked));
    debouncedSave(mealId, checked);
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

  function getDayAttendingCount(day: number): number {
    let count = 0;
    for (const mealType of ["lunch", "dinner"]) {
      const meal = mealsByDay(day, mealType);
      if (meal && responses.get(meal.id) === true) count++;
    }
    return count;
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
          Select the meals your family will attend. Changes are saved
          automatically.
        </p>

        {/* Days Accordion */}
        <Accordion type="multiple" className="space-y-2">
          {days.map((day) => {
            const lunch = mealsByDay(day, "lunch");
            const dinner = mealsByDay(day, "dinner");
            const count = getDayAttendingCount(day);

            return (
              <AccordionItem
                key={day}
                value={`day-${day}`}
                className="bg-white rounded-lg border border-gray-200 px-4 shadow-sm"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">
                      Day {day}
                    </span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {count} meal{count !== 1 ? "s" : ""} selected
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2 pb-1">
                    {lunch && (
                      <MealRow
                        meal={lunch}
                        label="Lunch"
                        attending={responses.get(lunch.id) ?? false}
                        onCheck={handleCheck}
                      />
                    )}
                    {dinner && (
                      <MealRow
                        meal={dinner}
                        label="Dinner"
                        attending={responses.get(dinner.id) ?? false}
                        onCheck={handleCheck}
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

interface MealRowProps {
  meal: Meal;
  label: string;
  attending: boolean;
  onCheck: (mealId: string, checked: boolean) => void;
}

function MealRow({ meal, label, attending, onCheck }: MealRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <label
        htmlFor={`meal-${meal.id}`}
        className="text-sm font-medium text-gray-800 cursor-pointer select-none"
      >
        {label}
      </label>
      <Checkbox
        id={`meal-${meal.id}`}
        checked={attending}
        onCheckedChange={(checked) => onCheck(meal.id, checked === true)}
        className="h-6 w-6"
      />
    </div>
  );
}
