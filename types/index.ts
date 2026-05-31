export interface FamilyWithMembers {
  id: string;
  itsId: string;
  headName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  editToken: string;
  createdAt: Date;
  members: Member[];
  rsvp?: Rsvp | null;
}

export interface Member {
  id: string;
  familyId: string;
  name: string;
  ageGroup: string;
}

export interface Meal {
  id: string;
  day: number;
  mealType: string;
}

export interface MealResponse {
  id: string;
  memberId: string;
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
  family: FamilyWithMembers;
  meals: Meal[];
  responses: MealResponse[];
}

export interface MealCountRow {
  day: number;
  mealType: string;
  count: number;
}
