# PBL-CFMS: Role & Permission Modification Guide

This guide explains how to change the security structure of the project (adding new roles, removing old ones, or changing what a role can do).

---

### Phase 1: The Backend (The Brain)

#### 1. Update the User Model
The "Source of Truth" for roles is the database blueprint.
- **File**: `backend/models/userModel.js`
- **Action**: Find the `role` line (around line 28) and update the `ENUM` list.
```javascript
// Example: Adding 'dean' as a new role
role: {
    type: DataTypes.ENUM('admin', 'faculty', 'student', 'reviewer', 'hod', 'dean'),
    defaultValue: 'student'
}
```

#### 2. Update the Route Guard (Middleware)
Now that the database knows about the role, you must tell the "Guard" who is allowed to enter which hallway.
- **File**: `backend/middleware/authMiddleware.js`
- **Action**:
    - **Method A (Specific Guard)**: Create a new function like `requireHOD`.
    ```javascript
    const requireDean = (req, res, next) => {
        if (req.user.role !== 'dean' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Dean only.' });
        }
        next();
    };
    ```
    - **Method B (General Guard)**: Use the `authorize` helper in your routes.
    ```javascript
    // In backend/routes/courseRoutes.js
    router.post('/audit', protect, authorize('admin', 'dean'), runAudit);
    ```

#### 3. Update Controller Logic
If the new role needs to see specific data (like an HOD seeing all courses), update the logic in the controllers.
- **File**: `backend/controllers/courseController.js`
- **Action**: Add an `if` check for the new role.
```javascript
if (req.user.role === 'dean') {
    // Logic to show all department courses
}
```

---

### Phase 2: The Frontend (The Face)

#### 1. Update the Sidebar (Navigation)
If you want the new role to see a new button in the sidebar:
- **File**: `client/src/components/Sidebar.jsx`
- **Action**: Update the `menuItems` list or add a conditional check in the `nav` section.
```javascript
{user.role === 'dean' && (
    <Link to="/audit-logs" className="...">Audit Logs</Link>
)}
```

#### 2. Update the Dashboard (The View)
This is where you define what the new role actually *sees* on their main screen.
- **File**: `client/src/pages/Dashboard.jsx`
- **Action**: 
    1. Create a "Fragment" or Component for the new role (e.g., `NewRoleView`).
    2. Add it to the main return statement of the Dashboard.
```javascript
{user.role === 'dean' && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Statistics and Audit Widgets */}
    </div>
)}
```

---

### Summary Table: "Who Can Do What?"

| Action | Files to Modify | Complexity |
| :--- | :--- | :--- |
| **Add a Role** | `userModel.js`, `Sidebar.jsx`, `Dashboard.jsx`, `authMiddleware.js` | High |
| **Remove a Role** | Remove from `userModel.js` (Caution: Update existing users first!) | Medium |
| **Add a Permission** | `authMiddleware.js` (Update `authorize` in routes) | Low |
| **Change Button Visibility** | `Sidebar.jsx` or `Dashboard.jsx` | Low |

---
*Note: Always restart your backend server and refresh the database schema after modifying models (ENUM change).*
