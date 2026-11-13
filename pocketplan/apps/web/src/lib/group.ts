export interface Member {
  id: string;
  name: string;
}

export interface GroupExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  /** Fixed when the expense is saved; "everyone" means the members at that time. */
  participants: string[];
}

export interface GroupSettlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  settledAt: string;
}

export interface Group {
  name: string;
  members: Member[];
  expenses: GroupExpense[];
  settlements: GroupSettlement[];
}

const everyone = ["rafi", "nila", "tanvir", "sumaiya"];

export const demoGroup: Group = {
  name: "Mess — Bashundhara",
  members: [
    { id: "rafi", name: "Rafi" },
    { id: "nila", name: "Nila" },
    { id: "tanvir", name: "Tanvir" },
    { id: "sumaiya", name: "Sumaiya" },
  ],
  expenses: [
    { id: "e1", description: "Flat rent (October)", amount: 32000, paidBy: "rafi", participants: everyone },
    { id: "e2", description: "Monthly bazar", amount: 8450.5, paidBy: "nila", participants: everyone },
    { id: "e3", description: "Electricity bill", amount: 2310, paidBy: "tanvir", participants: everyone },
    { id: "e4", description: "Internet (ISP)", amount: 1000, paidBy: "sumaiya", participants: everyone },
    { id: "e5", description: "Gas cylinder", amount: 1450, paidBy: "tanvir", participants: ["rafi", "nila", "tanvir"] },
    { id: "e6", description: "Medicine", amount: 640, paidBy: "tanvir", participants: ["tanvir"] },
  ],
  settlements: [
    { id: "s1", from: "sumaiya", to: "rafi", amount: 5000, settledAt: "2026-10-20T10:00:00.000Z" },
  ],
};
