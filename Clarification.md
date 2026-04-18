# Universal Elective Platform: Identity-First Governance Recap (Q2 & Q3)

This document recaps the finalized logic for the **Identity-First Enrollment** (Q2) and **Administrative Audit/Recap** (Q3) systems.

## 1. Identity Verification Gate (The "Three Columns")
The platform enforces a governance model where the **Email ID** is the primary "Head" of identity.

### Gate Workflow
- **Gate 1: Email Verification**: Only users logged in with an email found on the admin-uploaded **Invite List** are granted automatic "Invited" status.
- **Gate 2: Platform ID (2A vs 2B)**: The student's auto-generated Platform ID is compared against the value provided by the admin in the CSV.
- **Gate 3: Platform Username (2A vs 2B)**: The student's auto-generated Username is compared against the admin's provided value.

### Visual Indicators (Pink/Green)
- **Green Indicator**: Data provided by Admin (2B) matches the Dashboard Detail (2A).
- **Pink Indicator**: Mismatch detected.
- **Governance Rule**: Mismatches are **indicators only**. They do not block the student from participating, as the Email ID serves as the master key. However, they provide an audit trail for the admin to detect potential identity errors.

---

## 2. Universal Seat Pool Calculation (Q2 Confirmation)
Immediately after an admin uploads an Invite List, the system triggers a **Pool Confirmation Popup**.

### Calculation Formula
- `Invite Count` (Number of unique emails) × `Subject Count` (Total active subjects) = **`Total Universal Pool`**
- Example: 65 students × 5 subjects = **325 Total Seats**.
- This ensures that every student on the invite list is guaranteed a seat in the universal pool.

---

## 3. Administrative Real-Time Control (Bursting)
The admin maintains "Supreme Rights" to invalidate participation even after an election has started.

### Token Bursting (6 Modes)
Admins can "Burst" (invalidate) tokens based on:
1. **Subject-wide**: All seats for a specific course.
2. **Token-wide**: All tokens of a specific type (e.g., all "T1" tokens).
3. **Type ∩ Subject**: Intersection of a token type and a course.
4. **Participant-wide**: All tokens belonging to a specific student.
5. **Participant ∩ Subject**: A specific course booking for a specific student.
6. **Single Token**: A specific unique token ID.

### Burst Reason Repository
- Admins select from a predefined list of reasons or add new ones.
- Reasons are audited and stored immutably to explain why a student's privilege was removed.

---

## 4. Student Enrollment Disclaimer
When a student joins an election, they are met with a verification gate:
> "The admin has granted you access as the owner of this email. These details (Platform ID & Username) suit you; if not, please do not participate."

This places the final verification responsibility on the student while allowing the admin to correct any manual data entry errors via the Pink/Green dashboard alerts.
