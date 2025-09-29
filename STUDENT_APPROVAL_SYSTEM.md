# Student Approval System

## Overview

The student approval system prevents smurf accounts while allowing legitimate students to browse the platform. Students can register and access student pages, but cannot participate in activities until approved by an admin.

## How It Works

### 1. Student Registration Flow

- Students register through the normal signup process
- Account is created in `PendingStudent` collection
- After email confirmation, account moves to `Student` collection with `isApproved: false`
- Student can log in and browse but cannot participate in activities

### 2. Admin Approval Process

- Admins can see all students in the Student List with approval status
- Unapproved students show "Pending" status
- Admins can approve or reject students using action buttons
- Approved students get `isApproved: true` and can participate fully
- Rejected students have their accounts permanently deleted

### 3. Student Experience

#### Before Approval (Pending Status)

**What students CAN do:**

- Browse student pages and information
- View their profile and settings
- Check leaderboard and rankings
- Access the dashboard and start page

**What students CANNOT do:**

- Take weekly tests or exams
- Participate in games or duels
- Earn points or climb rankings
- Join game lobbies

#### After Approval (Approved Status)

- Full access to all features
- Can participate in all activities
- Can earn points and climb rankings

### 4. Technical Implementation

#### Backend Changes

- Added `isApproved` field to Student model (default: false)
- Created `studentApprovalMiddleware.js` for checking approval status
- Added approval/rejection endpoints in student controller
- Updated registration flow to set `isApproved: false`

#### Frontend Changes

- Updated StudentList to show approval status and buttons
- Created ApprovalStatus component to inform students of their status
- Added approval status display to student dashboard and start page
- Added success/error handling for approval actions

#### Middleware

- `requireStudentApproval`: Blocks unapproved students from activities
- `checkStudentApproval`: Allows browsing but adds approval info to request

### 5. API Endpoints

#### Student Approval Routes (Admin Only)

- `GET /api/modules/student-approval/pending` - Get pending students
- `PATCH /api/modules/student-approval/:id/approve` - Approve student
- `DELETE /api/modules/student-approval/:id/reject` - Reject student

#### Protected Routes

- Use `requireStudentApproval` middleware for activity routes
- Use `checkStudentApproval` middleware for browsing routes

### 6. Database Schema Changes

```javascript
// Student Model
{
  // ... existing fields
  isApproved: {
    type: Boolean,
    default: false
  }
  // ... other fields
}
```

### 7. Usage Examples

#### Adding Approval Check to Routes

```javascript
// For activities that require approval
router.post(
  "/take-exam",
  verifyToken,
  requireStudentApproval,
  examController.takeExam
);

// For browsing that shows approval status
router.get(
  "/profile",
  verifyToken,
  checkStudentApproval,
  studentController.getProfile
);
```

#### Frontend Approval Status Display

```jsx
import ApprovalStatus from "../components/ApprovalStatus";

// In component
<ApprovalStatus isApproved={user?.isApproved} isActive={user?.isActive} />;
```

### 8. Security Features

- Only admins can approve/reject students
- JWT token verification required for all approval actions
- Students cannot modify their own approval status
- Rejected students are permanently removed from the system

### 9. Benefits

- Prevents fake/smurf accounts
- Allows legitimate students to browse while waiting
- Gives admins control over who can participate
- Maintains platform integrity
- Clear communication of what students can/cannot do

### 10. Future Enhancements

- Bulk approval/rejection for multiple students
- Approval reasons and notes
- Temporary approval periods
- Automatic approval for certain criteria
- Email notifications for approval status changes

