/** The grades a school's published results can be given in, per exam type code (as the result form offers them). */
export const GRADE_OPTIONS: Record<string, string[]> = {
  a_level: ["A*", "A", "B", "C", "D", "E"],
  gcse: ["A*", "A", "B", "C", "9", "8", "7", "6", "5", "4", "3"],
  igcse: ["A*", "A", "B", "C", "9", "8", "7", "6", "5", "4"],
  ib: ["HL 7", "HL 6", "HL 5", "HL 4", "HL 3", "SL 7", "SL 6", "SL 5", "SL 4", "SL 3"],
  pre_u: ["Distinction", "Merit", "Pass", "D1", "D2", "D3", "M1", "M2", "M3"],
  btec: ["D*", "D", "M", "P"],
  higher: ["A", "B", "C"],
  advanced_higher: ["A", "B", "C"],
  national_5: ["A", "B", "C"],
  s5_higher: ["A", "B", "C"],
  s6_higher: ["A", "B", "C"],
}

/** IB average diploma points are out of 45 and stored with no grade. */
export const IB_MAX_POINTS = 45
