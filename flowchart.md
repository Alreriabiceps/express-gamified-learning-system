# Challenge System User Flows for AI Flowchart Generation

## FLOW 1: WEEKLY TEST - INDIVIDUAL MODE

**Flow Type:** Sequential Process with Validation
**Start:** Student Dashboard
**End:** Dashboard Return

**Steps:**

1. START: Student opens Weekly Test page
2. VALIDATION: System checks student approval status
3. DECISION: Is student approved?
   - NO: Show approval pending message, END
   - YES: Continue to step 4
4. PROCESS: Display available weekly tests
5. PROCESS: Student selects test from list
6. VALIDATION: Check test eligibility (not already attempted)
7. DECISION: Is student eligible for this test?
   - NO: Show previous results, go to step 14
   - YES: Continue to step 8
8. PROCESS: Initialize test session and 15-minute timer
9. PROCESS: Load first question
10. PROCESS: Student selects answer for current question
11. VALIDATION: System validates answer submission
12. DECISION: Are there more questions remaining?

- YES: Load next question, go to step 10
- NO: Continue to step 13

13. CALCULATION: Calculate final score and update student points
14. PROCESS: Display test results and achievements unlocked
15. DATABASE: Save test attempt to user records
16. UPDATE: Refresh leaderboard standings
17. END: Student returns to dashboard

**Error Handling:**

- Timer expires → Auto-submit current answers → go to step 13
- Network error → Save progress locally → retry submission

---

## FLOW 2: WEEKLY TEST - TEAM MODE

**Flow Type:** Collaborative Multi-User Process
**Start:** Party Formation
**End:** Party Return

**Steps:**

1. START: Student is in an active party
2. VALIDATION: Check if user is party leader
3. DECISION: Is user the party leader?
   - NO: Wait for leader action, go to step 8
   - YES: Continue to step 4
4. PROCESS: Leader selects weekly test from available options
5. VALIDATION: System validates all party members' eligibility
6. DECISION: Are all members eligible?
   - NO: Display ineligible members, remove them, go to step 5
   - YES: Continue to step 7
7. PROCESS: Create team test session with turn order
8. SOCKET: All party members receive test start notification
9. PROCESS: Navigate all members to team test interface
10. PROCESS: Display current question to all members
11. VALIDATION: Check if it's current user's turn
12. DECISION: Is it current user's turn?

- NO: Spectate mode (watch other player), go to step 15
- YES: Continue to step 13

13. PROCESS: Active player submits answer
14. SOCKET: Broadcast answer to all team members
15. PROCESS: Advance to next player's turn
16. DECISION: Are there more questions?

- YES: Go to step 10 (next question)
- NO: Continue to step 17

17. CALCULATION: Calculate team score
18. DATABASE: Save individual attempts for all members
19. PROCESS: Display team results to all members
20. UPDATE: Update points for all team members
21. END: All members return to party lobby

**Error Handling:**

- Player disconnects → Continue with remaining players
- Network issues → Pause for reconnection attempt

---

## FLOW 3: VERSUS MODE - PVP BATTLE

**Flow Type:** Competitive Real-time Matchmaking
**Start:** Versus Mode Lobby
**End:** Lobby Return

**Steps:**

1. START: Student opens Versus Mode lobby
2. VALIDATION: Check student approval and ban status
3. DECISION: Is student banned from matchmaking?
   - YES: Display ban duration and reason, END
   - NO: Continue to step 4
4. PROCESS: Student clicks "Find Match" button
5. QUEUE: Add student to matchmaking queue
6. PROCESS: System searches for suitable opponent
7. DECISION: Is opponent found immediately?
   - NO: Display "Searching..." with timer, wait for match
   - YES: Continue to step 8
8. SOCKET: Send "Match Found" notification to both players
9. PROCESS: Display match confirmation modal with opponent info
10. TIMER: Start 30-second acceptance countdown
11. DECISION: Does student accept match?

- NO: Apply penalty, return to queue
- YES: Continue to step 12

12. VALIDATION: Check if opponent also accepted
13. DECISION: Did both players accept?

- NO: Wait for other player or timeout
- YES: Continue to step 14

14. SOCKET: Emit match ready event
15. PROCESS: Show VS modal with player names
16. TIMER: 5-second countdown before game start
17. PROCESS: Initialize game state and deal cards (3 + 1 extra)
18. PROCESS: Both players select cards simultaneously
19. VALIDATION: Wait for both card selections
20. PROCESS: Reveal selected cards and load questions
21. PROCESS: Display question to both players
22. RACE: Players compete to answer first (speed + accuracy)
23. CALCULATION: Award points based on correctness and speed
24. DECISION: Has game end condition been met?

- NO: Deal new cards, go to step 18
- YES: Continue to step 25

25. CALCULATION: Calculate final scores and determine winner
26. DATABASE: Record match results and update PvP ratings
27. UPDATE: Apply rating changes (+8/-8 stars)
28. PROCESS: Display match results and rating changes
29. END: Both players return to versus mode lobby

**Error Handling:**

- Player disconnects → Award victory to remaining player
- Acceptance timeout → Apply ban and return to queue
- Network issues → Pause match and attempt reconnection

---

## FLOW 4: PARTY QUEUE - CREATE PARTY

**Flow Type:** Party Management Process
**Start:** Party Queue Page
**End:** Team Test Launch

**Steps:**

1. START: Student opens Party Queue page
2. VALIDATION: Check if student is already in a party
3. DECISION: Is student already in a party?
   - YES: Show current party details, END
   - NO: Continue to step 4
4. PROCESS: Display party creation options
5. PROCESS: Student clicks "Create Party" button
6. SELECTION: Student chooses party size (Duo=2, Trio=3, Squad=5)
7. PROCESS: Generate unique party ID and set student as leader
8. DATABASE: Create party record in system
9. PROCESS: Add party to public party list
10. SOCKET: Enable real-time party updates
11. PROCESS: Display party lobby with member slots
12. WAIT: System waits for other students to join
13. SOCKET: Notify leader when members join/leave
14. VALIDATION: Check if minimum members present (2+ players)
15. DECISION: Does party have enough members?

- NO: Wait for more members, go to step 12
- YES: Continue to step 16

16. PROCESS: Leader selects weekly test to start
17. VALIDATION: Validate all members' test eligibility
18. DECISION: Are all members eligible?

- NO: Show ineligible members, option to kick/wait
- YES: Continue to step 19

19. SOCKET: Send test start notification to all members
20. END: System launches team test for all members

**Error Handling:**

- Leader disconnects → Transfer leadership to next member
- Party becomes empty → Auto-delete party

---

## FLOW 5: PARTY QUEUE - JOIN PARTY

**Flow Type:** Party Discovery and Joining
**Start:** Party Queue Page
**End:** Team Test Launch

**Steps:**

1. START: Student opens Party Queue page
2. VALIDATION: Check if student is already in a party
3. DECISION: Is student already in a party?
   - YES: Show current party details, END
   - NO: Continue to step 4
4. PROCESS: Display list of available public parties
5. FILTER: Student can search/filter parties by name or size
6. PROCESS: Student selects desired party from list
7. VALIDATION: Check if party has available slots
8. DECISION: Is party full?
   - YES: Show "Party Full" error message
   - NO: Continue to step 9
9. VALIDATION: Check if party is private
10. DECISION: Is party private?

- YES: Prompt for password, validate input
- NO: Continue to step 11

11. PROCESS: Add student to party as member
12. DATABASE: Update party member list
13. SOCKET: Notify all party members of new join
14. PROCESS: Display party lobby interface
15. WAIT: Student waits in party for leader decisions
16. SOCKET: Receive real-time updates from party actions
17. DECISION: Did leader start a test?

- NO: Continue waiting in party
- YES: Continue to step 18

18. VALIDATION: Check student's eligibility for selected test
19. DECISION: Is student eligible?

- NO: Show ineligible message, may be kicked
- YES: Continue to step 20

20. END: System launches team test for all members

**Error Handling:**

- Wrong password → Show error, allow retry
- Party deleted while joining → Return to party list
- Connection lost → Attempt to rejoin party

---

## AI GENERATION INSTRUCTIONS:

**Visual Elements:**

- Use rectangular boxes for PROCESS, VALIDATION, CALCULATION, DATABASE, UPDATE steps
- Use diamond shapes for DECISION points
- Use oval/rounded boxes for START and END points
- Use hexagon shapes for SOCKET, QUEUE, TIMER operations
- Use parallelogram shapes for FILTER, SELECTION operations
- Connect elements with arrows showing flow direction

**Flow Connections:**

- Sequential flows: straight arrows
- Decision branches: labeled arrows (YES/NO)
- Loop backs: curved arrows returning to previous steps
- Parallel processes: multiple arrows from single point
- Error handling: dashed red arrows to error states

**Color Coding:**

- Blue: Standard process flows
- Green: Success paths and validations
- Red: Error handling and negative outcomes
- Orange: Real-time operations (SOCKET, TIMER)
- Purple: Data operations (DATABASE, CALCULATION)

**Grouping:**

- Group related flows under challenge categories
- Show clear separation between different user journeys
- Include error handling paths as separate color/style
