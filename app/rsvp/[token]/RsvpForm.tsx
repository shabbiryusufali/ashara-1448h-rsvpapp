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
import type { FamilyWithMembers, Meal, MealResponse } from "@/types";

interface RsvpFormProps {
  family: FamilyWithMembers;
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
      map.set(`${r.memberId}:${r.mealId}`, r.attending);
    }
    return map;
  });

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [submitted, setSubmitted] = useState(!!family.rsvp);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = family.editToken;

  const debouncedSave = useCallback(
    (memberId: string, mealId: string, attending: boolean) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setSaveStatus("saving");
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/rsvp/${token}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId, mealId, attending }),
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

  function handleCheck(memberId: string, mealId: string, checked: boolean) {
    const key = `${memberId}:${mealId}`;
    setResponses((prev) => new Map(prev).set(key, checked));
    debouncedSave(memberId, mealId, checked);
  }

  function handleToggleAll(mealId: string, checked: boolean) {
    const newMap = new Map(responses);
    for (const member of family.members) {
      newMap.set(`${member.id}:${mealId}`, checked);
      debouncedSave(member.id, mealId, checked);
    }
    setResponses(newMap);
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

  // Group meals by day
  const days = Array.from({ length: 10 }, (_, i) => i + 1);
  const mealsByDay = (day: number, mealType: string) =>
    meals.find((m) => m.day === day && m.mealType === mealType);

  function getMealAttendingCount(mealId: string): number {
    return family.members.filter(
      (m) => responses.get(`${m.id}:${mealId}`) === true
    ).length;
  }

  function areAllAttending(mealId: string): boolean {
    return family.members.every(
      (m) => responses.get(`${m.id}:${mealId}`) === true
    );
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
            <p className="text-sm text-gray-500">ITS: {family.itsId}</p>
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
              <Link
                href={`/rsvp/${token}`}
                className="underline font-medium"
              >
                Edit RSVP
              </Link>
            </p>
          </div>
        )}

        {/* Family Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Family Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {family.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5"
                >
                  <span className="text-sm font-medium">{member.name}</span>
                  <Badge
                    variant={member.ageGroup === "adult" ? "default" : "secondary"}
                    className="text-xs py-0"
                  >
                    {member.ageGroup}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
          Select the meals each family member will attend. Changes are saved
          automatically.
        </p>

        {/* Days Accordion */}
        <Accordion type="multiple" className="space-y-2">
          {days.map((day) => {
            const breakfast = mealsByDay(day, "breakfast");
            const dinner = mealsByDay(day, "dinner");

            const breakfastCount = breakfast
              ? getMealAttendingCount(breakfast.id)
              : 0;
            const dinnerCount = dinner ? getMealAttendingCount(dinner.id) : 0;
            const totalCount = breakfastCount + dinnerCount;

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
                    {totalCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {totalCount} attending
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-5 pt-2">
                    {breakfast && (
                      <MealSection
                        meal={breakfast}
                        label="Breakfast"
                        members={family.members}
                        responses={responses}
                        onCheck={handleCheck}
                        onToggleAll={handleToggleAll}
                        allAttending={areAllAttending(breakfast.id)}
                      />
                    )}
                    {dinner && (
                      <MealSection
                        meal={dinner}
                        label="Dinner"
                        members={family.members}
                        responses={responses}
                        onCheck={handleCheck}
                        onToggleAll={handleToggleAll}
                        allAttending={areAllAttending(dinner.id)}
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

interface MealSectionProps {
  meal: Meal;
  label: string;
  members: FamilyWithMembers["members"];
  responses: Map<string, boolean>;
  onCheck: (memberId: string, mealId: string, checked: boolean) => void;
  onToggleAll: (mealId: string, checked: boolean) => void;
  allAttending: boolean;
}

function MealSection({
  meal,
  label,
  members,
  responses,
  onCheck,
  onToggleAll,
  allAttending,
}: MealSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
        <span className="font-medium text-sm text-gray-700 uppercase tracking-wide">
          {label}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <label
            htmlFor={`toggle-all-${meal.id}`}
            className="text-sm text-gray-500 cursor-pointer select-none"
          >
            All
          </label>
          <Checkbox
            id={`toggle-all-${meal.id}`}
            checked={allAttending}
            onCheckedChange={(checked) =>
              onToggleAll(meal.id, checked === true)
            }
          />
        </div>
      </div>
      <div className="space-y-3">
        {members.map((member) => {
          const key = `${member.id}:${meal.id}`;
          const attending = responses.get(key) ?? false;
          return (
            <div
              key={member.id}
              className="flex items-center justify-between py-1"
            >
              <label
                htmlFor={`${member.id}-${meal.id}`}
                className="text-sm font-medium text-gray-800 cursor-pointer select-none flex-1 pr-4"
              >
                {member.name}
                <span className="ml-2 text-xs text-gray-400">
                  ({member.ageGroup})
                </span>
              </label>
              <Checkbox
                id={`${member.id}-${meal.id}`}
                checked={attending}
                onCheckedChange={(checked) =>
                  onCheck(member.id, meal.id, checked === true)
                }
                className="h-6 w-6"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
