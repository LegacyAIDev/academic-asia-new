# Scheduler — Quick Guide for Staff

**Last updated:** 2026-10-12

## Who can do what

| Access | What you can do |
|---|---|
| Scheduler view only | See all calendars and bookings, open details, copy booking details. The command bar shows a "View only" badge. |
| Scheduler edit | Create, edit, move and cancel bookings. |
| Exams edit (examination officers, managers) | Confirm exam bookings, record attendance, manage rooms and locations. |

Access is set per staff level under **Settings › Access levels** and can be overridden for one person on their staff page (**Staff › edit**). If you see "View only", ask a manager for Scheduler edit access.

## Creating a booking

Click or drag on an empty slot, right-click an empty slot and choose **New booking**, or use **New booking** in the command bar. Then choose the type:

| You want to book | Type to choose | Notes |
|---|---|---|
| A staff appointment or internal meeting | Internal meeting | Add colleagues under Who. |
| A meeting with a student or family | Consultation | Pick the student; add the consultant. |
| A school interview | School interview | Pick the student and application. |
| An exam for one student | Examination | Or use **Schedule** on the Exams page, which pre-fills the request. An examination officer confirms it. |
| A group exam | Group examination | Add each candidate; seat numbers are optional. |
| A room only | Room reservation | Pick the room and describe the purpose. |

**Choosing papers for an examination** (Examination and Group examination): pick the application first, which sets the school. A **Papers** block then lists that school's entrance exam papers. Narrow them by **entry year** (the newest is preselected) and **year level**, and tick up to 20. Chosen papers appear below the list and can be removed with their cross. Changing the school clears the chosen papers. If you leave **Assessment** empty it is named after the subjects, for example "English, Mathematics and Reasoning", and follows your papers until you type your own. The list shows the format only (subject, year level, length, "Request from school"), not the papers themselves. For a group exam with candidates from different schools, only the first school's papers are offered.

Every booking is either **in a room** or **online**. Room suggestions show how many seats are left at that time.

Shortcuts:
- In the **Rooms** view, the column you click pre-selects that room.
- In the **Team** view, the column you click pre-selects that colleague or student.
- In the **Month** view, clicking a day starts a one-hour booking at 09:00.

## Finding your way around

- **My calendar / Team / Rooms** switch whose calendar you see. In Team, use **People** to pick colleagues or students; in Day and Week each person gets their own column.
- Click the **date** in the command bar to jump to any day.
- **Filters** narrow by booking type, room and status. "Cancelled" shows only cancelled bookings.
- Click a booking for its details. **Open** shows it on its own page; **Back to calendar** returns to the same view and filters.
- Opening a booking from the **Exams** page or a student's **Calendar** tab brings you back there (**Back to exams** / **Back to student**).
- The dashboard card **Exams awaiting confirmation** opens the Rooms week of the earliest pending exam.

## Right-click menu

- **On a booking:** Open details, Open in new tab, Edit, Confirm (pending exams), Cancel booking, Copy details, Copy for family (exams).
- **On an empty slot:** New booking at that time, Go to today.

## Copying details

- **Copy details** puts a plain-text summary on the clipboard (date, time in Hong Kong time, location and address, room, seats, people, notes).
- **Copy for family** (exams only) gives the family version: student, school, assessment, date, time, address, room and instructions, plus the seat when one has been assigned.

## Exam desk

**Exams** opens the exam desk, the list for the day of the exams. It shows examination and group examination bookings that are not cancelled.

- **Dates:** it starts on today (Hong Kong time). Change **From** and **To** to look at other days; up to 62 days at once.
- **Two lists:** **Booked list** shows who is still waiting; **Showed up list** shows who has arrived. A group exam is one row listing all its candidates.
- **Filter and search:** narrow by room, school and entry year (the choices come from the exams in your dates), or type a student name or code, school, assessment or title.
- **Sort:** click any column heading; click again to reverse. Your dates, filters and sorting stay in the page address, so you can bookmark or share it.
- **Buttons** (need Exams edit access): **Confirm** on a booking awaiting confirmation. **Showed up** or **No show** on a confirmed booking. If someone marked No show arrives late, press **Showed up**. Showed up completes the student's exam request and cannot be undone. **Open booking** opens the booking page.
- **Columns:** Time, Student, School, Entry point (year level of the chosen papers and entry year, for example "2027 entry"), Assessment format, Paper availability, Room / seat, Status, Actions.
- **Paper availability** is checked each time the page opens, because papers are often uploaded after the booking. Each chosen paper is counted once:
  - **uploaded:** a file is stored and can be printed.
  - **online:** only a link is stored (an online test or a paper kept elsewhere).
  - **request from school:** the school keeps the paper and sends it for each sitting.
  - **not uploaded:** nothing is stored yet.
  
  Example: "2 uploaded · 1 request from school · 1 not uploaded". "No papers chosen" means the booking has none. Sorting this column puts the bookings with the most missing papers first. "Could not be checked" (with a red message) means the lookup failed; reload the page, and do not read it as missing papers. Only the exam team sees the paper files themselves.
- **Print available** (exam team, Exams edit access; shown when at least one paper has a file or link): opens a window with one **Open** link per paper, the papers to request from the school, and a link to the school's entrance exams. The links stop working after five minutes; close and reopen the window for fresh ones.
- **Past exams and scores:** choose **All exams** for the full exam list with status tabs, score entry and Schedule / Reschedule. It has its own From / To filter on the scheduled date. Exam requests that were never booked in the scheduler appear only there.

## Marking a paper "Do not store – request from school"

Some schools ask us not to keep their paper. On the school's page, open **Entrance exams**, edit the exam and choose **Do not store – request from school: Yes**. Nothing is uploaded for it and the list shows an **On request** badge. On the exam desk it counts as "request from school", not as missing. Files uploaded earlier stay stored but are no longer offered for printing. This is separate from "paper held in the office", which means a physical copy is kept at the centre. Only the examination team can add or open paper files.
