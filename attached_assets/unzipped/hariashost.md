# Hari as Host
## Multi-Semester Elective Allocation — Single Election
### Universal Course Opting System (UCOS)

---

## The Scenario

Hari is given charge to allocate elective courses for his entire batch across 3 semesters — done in **one single election upfront**.

---

## Fixed Parameters

| Parameter | Value |
|---|---|
| Total students | 126 (Section A: 63, Section B: 63) |
| Total courses in pool | 12 |
| Semesters covered | 5th, 6th, 7th |
| Courses running per semester | 2 |
| Faculty per semester | 2 (one per course) |
| Classes per semester | 2 (one class of 63 per course) |
| Courses per student (total) | 3 (one per semester, all different) |
| **Tokens per student** | **12 — T1 to T12 (same system, just extended)** |
| Global seat pool | 126 × 12 = 1,512 seats (S-0001 to S-1512) |

---

## The 12-Course Pool

```
 1. Machine Learning              7. Cloud Computing
 2. Artificial Intelligence       8. Cyber Security
 3. Internet of Things            9. Data Science
 4. Full Stack Development       10. Computer Vision
 5. App Development              11. Natural Language Processing
 6. Software Development         12. Blockchain Technology
```

---

## Token System — Same as Always, Just T1 to T12

This is identical to the standard UCOS token system. The only change:

```
Standard election (5 courses):   T1, T2, T3, T4, T5
This election    (12 courses):   T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12
```

- Token format: A2301107031-T1 through A2301107031-T12
- System uses tokens in ascending order automatically — same rule as always
- Student books all 12 courses in their preferred order
- T1 = most preferred, T12 = least preferred
- Every booking draws the next available seat from the global pool S-0001 to S-1512

Nothing else changes. Same FCFS, same burst, same cascade, same admin allocation panel.

---

## What the Election Produces

From 12 courses, admin selects 6 to run (2 per semester × 3 semesters).
The other 6 are burst.

Each student ends up with 3 confirmed courses — one per semester, all different.

```
5th Semester → 2 courses → 2 classes of 63 → 2 faculty
6th Semester → 2 courses → 2 classes of 63 → 2 faculty
7th Semester → 2 courses → 2 classes of 63 → 2 faculty
─────────────────────────────────────────────────────────
6 classes total | 378 final slots (126 × 3) | 6 faculty
```

---

## Allocation Flow

**Round 1 pool — T1 + T2 demand (252 entries, same as always)**

Admin sees demand across all 12 courses. Picks top 6 by demand, distributes 2 per semester. Confirms top 6, bursts bottom 6. Burst students cascade individually to T3, T4... exactly as in a standard election.

**No-repetition constraint**

When assigning 6th semester, system excludes whatever course each student already received in 5th semester. Same for 7th — excludes both Sem5 and Sem6 courses per student. Each student ends up with 3 unique courses.

---

## Final Output — Single CSV

```
Register No | Name          | Sem 5            | Sem 6            | Sem 7
────────────────────────────────────────────────────────────────────────────
2301107031  | Hari          | Machine Learning | AI               | App Dev
2301107032  | Bharanidharan | Machine Learning | Data Science     | Cloud
2301107033  | Priya         | Full Stack Dev   | AI               | Cloud
2301107034  | Kavya         | Full Stack Dev   | Data Science     | App Dev
```

---

## What Actually Changed vs Standard Election

| Item | Standard Election | This Election |
|---|---|---|
| Tokens per student | T1 to T5 | **T1 to T12** |
| Seat pool | 630 (126 × 5) | **1,512 (126 × 12)** |
| Final courses per student | 2 | **3** |
| Semesters | 1 | **3** |
| Courses running | 4–5 | **6 (2 per semester)** |
| Everything else | — | **Identical** |

Same system. Same algorithm. Same admin panel. Only the numbers scale up.

---

*hariashost.md | UCOS | February 2026*
