/**
 * COHORT CONFIGURATION
 * 
 * Manage all student cohorts for the Cohort Console.
 * To add a new cohort:
 *   1. Add a new object to this array with a unique `id`, `title`, `subtitle`, and `studentsFile`.
 *   2. Ensure the corresponding student JSON file (e.g., `students_2024_28.json`) is placed in the project root.
 *   3. The dashboard will automatically render the cohort card on the homepage and handle routing/loading!
 */

const cohorts = [
  {
    id: "2023-27",
    title: "2023–27 B-Tech",
    subtitle: "Student Cohort",
    studentCount: 28, // Can also be computed dynamically from studentsFile
    studentsFile: "students.json",
    department: "Computer Science & Engineering",
    academicYears: "2023 – 2027",
    status: "active", // "active" | "upcoming"
    description: "Active B-Tech cohort tracking live LeetCode competitive programming progress, contest ratings, and submission history."
  }
  /*
  // Example for future cohorts:
  ,
  {
    id: "2024-28",
    title: "2024–28 B-Tech",
    subtitle: "Student Cohort",
    studentCount: 0,
    studentsFile: "students_2024_28.json",
    department: "Computer Science & Engineering",
    academicYears: "2024 – 2028",
    status: "upcoming",
    description: "Upcoming B-Tech student cohort — registration & profile collection in progress."
  },
  {
    id: "2025-29",
    title: "2025–29 B-Tech",
    subtitle: "Student Cohort",
    studentCount: 0,
    studentsFile: "students_2025_29.json",
    department: "Computer Science & Engineering",
    academicYears: "2025 – 2029",
    status: "upcoming",
    description: "Future B-Tech student cohort."
  },
  {
    id: "2026-30",
    title: "2026–30 B-Tech",
    subtitle: "Student Cohort",
    studentsFile: "students_2026_30.json",
    department: "Computer Science & Engineering",
    academicYears: "2026 – 2030",
    status: "upcoming",
    description: "Future B-Tech student cohort."
  }
  */
];

// Expose globally for vanilla JS browser environment
window.cohorts = cohorts;
window.COHORTS_CONFIG = cohorts;
