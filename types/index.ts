export interface Family {
  id: string;
  itsId: string;
  headName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  memberCount: number;
  editToken: string;
  createdAt: Date;
  rsvp?: Rsvp | null;
}

// Kept for backwards compat with any remaining references
export type FamilyWithMembers = Family;

export interface Meal {
  id: string;
  day: number;
  mealType: string;
}

export interface MealResponse {
  id: string;
  familyId: string;
  mealId: string;
  attending: boolean;
}

export interface Rsvp {
  id: string;
  familyId: string;
  submittedAt: Date;
  updatedAt: Date;
}

export interface RsvpPageData {
  family: Family;
  meals: Meal[];
  responses: MealResponse[];
}

export interface MealCountRow {
  day: number;
  mealType: string;
  count: number;
}
