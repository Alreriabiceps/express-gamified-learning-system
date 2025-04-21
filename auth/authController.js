// Admin login logic (fixed username and password)
exports.adminLogin = async (req, res) => {
    const { username, password } = req.body;
  
    // Check if username and password match 'admin' credentials
    if (username === 'admin' && password === 'admin') {
      const token = 'admin-token'; // Example token
  
      // Send a response with role information
      return res.json({
        message: 'Admin login successful',
        token,
        role: 'admin',  // Add role as 'admin'
      });
    } else {
      return res.status(401).json({ error: 'Incorrect admin credentials' });
    }
  };
  
  // Student login logic (using studentId and password)
  exports.studentLogin = async (req, res) => {
    const { studentId, password } = req.body;
  
    try {
      // Check if student exists
      const student = await Student.findOne({ studentId });
  
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      // Check if password matches (assuming you're storing the password as plain text)
      if (student.password !== password) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
  
      const token = 'student-token'; // Example token
  
      // Send a response with role information
      return res.json({
        message: 'Student login successful',
        token,
        role: 'student',  // Add role as 'student'
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  