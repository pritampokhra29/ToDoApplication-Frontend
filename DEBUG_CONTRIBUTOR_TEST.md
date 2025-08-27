# Debug Contributor Functionality Test

## 🔍 **What to Check in Browser Console**

### **1. Open Browser Developer Tools**
- Press `F12` or right-click → "Inspect"
- Go to "Console" tab

### **2. Create a New Task**
- Click "Add New Task" button
- Check console for these logs:

```
API: Fetching users for assignment from URL: http://localhost:3000/auth/users/active
API: Assignment users response: [...]
Users for assignment loaded successfully: [...]
```

### **3. Check Debug Information**
- Look for the debug text in the Contributors section:
  - Should show: "Available users: X | Selected: 0"
  - X should be > 0 if users were loaded

### **4. Test Adding Contributors**
- Select a user from the dropdown
- Click "Add" button
- Check console for:

```
Added contributor: [username]
Current contributors: [...]
```

### **5. Common Issues & Solutions**

| Problem | What to Check | Fix |
|---------|---------------|-----|
| **Debug shows "Available users: 0"** | Console for API errors | Check network tab, backend health |
| **Dropdown is empty** | API response format | Backend should return user array |
| **"User not found" error** | Console logs | availableActiveUsers array |
| **No console logs** | App loading | Refresh page, check for JS errors |

### **6. Network Tab Check**
- Go to "Network" tab in DevTools
- Create/edit a task
- Look for:
  - `GET /auth/users/active` - should return 200 with user array
  - `POST /tasks` - should return 200 when saving task

### **7. Expected API Responses**

**GET /auth/users/active should return:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@todolist.com",
    "active": true
  },
  {
    "id": 2, 
    "username": "harshita",
    "email": "harshita@example.com",
    "active": true
  }
]
```

**POST /tasks should include collaborators:**
```json
{
  "title": "Task Title",
  "description": "Task Description", 
  "collaborators": [
    {
      "id": 1,
      "username": "admin"
    }
  ]
}
```

## 🎯 **Manual Testing Steps**

1. **Login** as any user (admin or harshita)
2. **Click "Add New Task"**
3. **Check debug info** - should show available users count
4. **Fill basic task info** (title, description, etc.)
5. **In Contributors section**:
   - Select user from dropdown
   - Click "Add" 
   - Verify user appears in selected contributors
6. **Save task**
7. **Verify** contributor appears on task card

## ✅ **Success Indicators**

- ✅ Debug shows "Available users: X" where X > 0
- ✅ Dropdown populates with users
- ✅ Adding contributor shows success message
- ✅ Selected contributors display correctly
- ✅ Task saves with contributors
- ✅ Contributors appear on task cards

## ❌ **Failure Indicators**

- ❌ Debug shows "Available users: 0"
- ❌ Dropdown remains empty
- ❌ Error messages when adding contributors
- ❌ No success feedback
- ❌ Contributors don't persist after saving

## 🛠 **If Still Not Working**

1. **Check the backend logs** for any API errors
2. **Verify user authentication** - some endpoints need proper auth
3. **Check CORS settings** if API calls are blocked
4. **Verify backend users exist** and are active
5. **Clear browser cache** and refresh
