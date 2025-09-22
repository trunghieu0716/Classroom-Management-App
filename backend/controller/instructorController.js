const admin = require('firebase-admin');
const db = admin.firestore();
const { genRandomCode } = require('../utils/genCode');
const twilio = require('../config/twilio');

// Get all instructors
exports.getAllInstructors = async (req, res) => {
  try {
    const instructorsRef = db.collection('instructors');
    const snapshot = await instructorsRef.get();
    
    if (snapshot.empty) {
      return res.status(200).json({ instructors: [] });
    }
    
    const instructors = [];
    snapshot.forEach(doc => {
      instructors.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return res.status(200).json({ instructors });
  } catch (error) {
    console.error('Error getting instructors:', error);
    return res.status(500).json({ error: 'Failed to fetch instructors' });
  }
};

// Get instructor by ID
exports.getInstructor = async (req, res) => {
  try {
    // Lấy instructorId từ token thay vì từ params
    const instructorId = req.user ? req.user.phoneNumber : null;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor not authenticated' });
    }
    
    const instructorDoc = await db.collection('instructors').doc(instructorId).get();
    
    if (!instructorDoc.exists) {
      return res.status(404).json({ error: 'Instructor not found' });
    }
    
    return res.status(200).json({
      id: instructorDoc.id,
      ...instructorDoc.data()
    });
  } catch (error) {
    console.error('Error getting instructor:', error);
    return res.status(500).json({ error: 'Failed to fetch instructor' });
  }
};

// Update instructor profile
exports.updateInstructor = async (req, res) => {
  try {
    // Lấy instructorId từ token thay vì từ params
    const instructorId = req.user ? req.user.phoneNumber : null;
    const updateData = req.body;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor not authenticated' });
    }
    
    // Ensure the instructor exists
    const instructorRef = db.collection('instructors').doc(instructorId);
    const instructorDoc = await instructorRef.get();
    
    if (!instructorDoc.exists) {
      return res.status(404).json({ error: 'Instructor not found' });
    }
    
    // Update the instructor document
    await instructorRef.update(updateData);
    
    return res.status(200).json({ 
      message: 'Instructor updated successfully',
      id: instructorId,
      ...updateData
    });
  } catch (error) {
    console.error('Error updating instructor:', error);
    return res.status(500).json({ error: 'Failed to update instructor' });
  }
};

// Delete instructor
exports.deleteInstructor = async (req, res) => {
  try {
    // Lấy instructorId từ token thay vì từ params
    const instructorId = req.user ? req.user.phoneNumber : null;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor not authenticated' });
    }
    
    // Ensure the instructor exists
    const instructorRef = db.collection('instructors').doc(instructorId);
    const instructorDoc = await instructorRef.get();
    
    if (!instructorDoc.exists) {
      return res.status(404).json({ error: 'Instructor not found' });
    }
    
    // Delete the instructor document
    await instructorRef.delete();
    
    return res.status(200).json({ 
      message: 'Instructor deleted successfully',
      id: instructorId
    });
  } catch (error) {
    console.error('Error deleting instructor:', error);
    return res.status(500).json({ error: 'Failed to delete instructor' });
  }
};

// Get all students for an instructor
exports.getInstructorStudents = async (req, res) => {
  try {
    // Lấy instructorId từ token thay vì từ params
    const instructorId = req.user ? req.user.phoneNumber : null;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor not authenticated' });
    }
    
    console.log('Looking for students with instructorId:', instructorId);
    
    // Get all students in the collection first 
    const allStudents = await db.collection('students').get();
    console.log('All students in collection:', allStudents.size);
    
    // For now, we'll return all students since instructorId is not set in existing records
    const students = [];
    
    allStudents.forEach(doc => {
      console.log('Student doc:', doc.id, 'Data:', doc.data());
      
      // Add each student to the results
      students.push({
        id: doc.id,
        ...doc.data()
      });
      
      // Update the student record to include the instructorId for future queries
      if (!doc.data().instructorId) {
        // Update the student document to include instructorId
        db.collection('students').doc(doc.id).update({
          instructorId: instructorId
        }).then(() => {
          console.log('Updated student with instructorId:', doc.id);
        }).catch(err => {
          console.error('Error updating student:', err);
        });
      }
    });
    
    console.log('Returning students count:', students.length);
    
    return res.status(200).json({ students });
  } catch (error) {
    console.error('Error getting instructor students:', error);
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Add new student to an instructor
exports.addStudent = async (req, res) => {
  try {
    // Lấy instructorId từ token thay vì từ params
    const instructorId = req.user ? req.user.phoneNumber : null;
    const { name, email, phone } = req.body;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor not authenticated' });
    }
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Student name and email are required' });
    }
    
    // Check if instructor exists in users collection (we're storing instructors there)
    const instructorDoc = await db.collection('users').doc(instructorId).get();
    if (!instructorDoc.exists) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    // Check if student with email already exists
    const existingEmailQuery = await db.collection('students').where('email', '==', email).get();
    if (!existingEmailQuery.empty) {
      // Let's check if this student belongs to this instructor
      const existingStudent = existingEmailQuery.docs[0].data();
      if (existingStudent.instructorId === instructorId) {
        return res.status(400).json({ 
          error: 'A student with this email already exists in your classroom' 
        });
      } else {
        return res.status(400).json({ 
          error: 'A student with this email exists but is assigned to another instructor' 
        });
      }
    }
    
    // Import email service for sending invitation
    const { sendStudentInvitationEmail } = require('../service/newEmailService');
    const crypto = require('crypto');
    
    // Generate a unique setup token for the verification link
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupExpiry = new Date();
    setupExpiry.setDate(setupExpiry.getDate() + 7); // Token valid for 7 days
    
    // Create new student document with setupCompleted=false (will be true after verification)
    const studentData = {
      name,
      email,
      phone: phone || '',
      instructorId: instructorId, // Ensure this is the phone number
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      setupCompleted: false, // Student needs to verify email and complete setup
      setupToken: setupToken,
      setupExpiry: setupExpiry,
    };
    
    console.log('Creating student with data:', studentData);
    
    // Add student with email as document ID
    const studentRef = db.collection('students').doc(email);
    await studentRef.set(studentData);
    
    console.log('Student added to database:', {
      id: email,
      ...studentData
    });
    
    // Send invitation email to the student
    try {
      const emailResult = await sendStudentInvitationEmail(email, name, setupToken);
      console.log('Invitation email sent:', emailResult);
      
      if (emailResult.developmentLink) {
        console.log('Development verification link:', emailResult.developmentLink);
      }
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // We don't want to fail the entire operation if just the email fails
    }
    
    return res.status(201).json({
      message: 'Student added successfully and invitation email sent',
      student: {
        id: email,
        ...studentData,
        setupToken: undefined // Don't return the token to the client
      }
    });
  } catch (error) {
    console.error('Error adding student:', error);
    return res.status(500).json({ error: 'Failed to add student' });
  }
};

// Update student details
exports.updateStudent = async (req, res) => {
  try {
    // Lấy instructorId từ token thay vì từ params
    const instructorId = req.user ? req.user.phoneNumber : null;
    const { studentId } = req.params;
    const updateData = req.body;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor not authenticated' });
    }
    
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    
    // Check if student exists and belongs to the instructor
    const studentRef = db.collection('students').doc(studentId);
    const studentDoc = await studentRef.get();
    
    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const studentData = studentDoc.data();
    if (studentData.instructorId !== instructorId) {
      return res.status(403).json({ error: 'Student does not belong to this instructor' });
    }
    
    // Update the student document
    await studentRef.update(updateData);
    
    return res.status(200).json({
      message: 'Student updated successfully',
      student: {
        id: studentId,
        ...studentData,
        ...updateData
      }
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return res.status(500).json({ error: 'Failed to update student' });
  }
};

// Remove student from instructor
exports.removeStudent = async (req, res) => {
  try {
    // Lấy instructorId từ token thay vì từ params
    const instructorId = req.user ? req.user.phoneNumber : null;
    const { studentId } = req.params;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor not authenticated' });
    }
    
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    
    // Check if student exists and belongs to the instructor
    const studentRef = db.collection('students').doc(studentId);
    const studentDoc = await studentRef.get();
    
    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const studentData = studentDoc.data();
    if (studentData.instructorId !== instructorId) {
      return res.status(403).json({ error: 'Student does not belong to this instructor' });
    }
    
    // Delete the student document
    await studentRef.delete();
    
    return res.status(200).json({
      message: 'Student removed successfully',
      id: studentId
    });
  } catch (error) {
    console.error('Error removing student:', error);
    return res.status(500).json({ error: 'Failed to remove student' });
  }
};

// Create a lesson for students
exports.createLesson = async (req, res) => {
  try {
    // Lấy instructorId từ token thay vì từ params
    const instructorId = req.user ? req.user.phoneNumber : null;
    const { title, description, scheduledDate, studentIds } = req.body;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor not authenticated' });
    }
    
    if (!title || !scheduledDate || !studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ error: 'Title, scheduled date, and student IDs array are required' });
    }
    
    // Check if instructor exists
    const instructorDoc = await db.collection('instructors').doc(instructorId).get();
    if (!instructorDoc.exists) {
      return res.status(404).json({ error: 'Instructor not found' });
    }
    
    // Create the lesson
    const lessonData = {
      title,
      description: description || '',
      scheduledDate: new Date(scheduledDate),
      instructorId,
      studentIds,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'scheduled'
    };
    
    const lessonRef = await db.collection('lessons').add(lessonData);
    
    return res.status(201).json({
      message: 'Lesson created successfully',
      lesson: {
        id: lessonRef.id,
        ...lessonData
      }
    });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return res.status(500).json({ error: 'Failed to create lesson' });
  }
};

// Get all lessons for an instructor
exports.getInstructorLessons = async (req, res) => {
  try {
    // Lấy instructorId từ token thay vì từ params
    const instructorId = req.user ? req.user.phoneNumber : null;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor not authenticated' });
    }
    
    // Query lessons where instructorId matches
    const lessonsRef = db.collection('lessons');
    const snapshot = await lessonsRef.where('instructorId', '==', instructorId).get();
    
    if (snapshot.empty) {
      return res.status(200).json({ lessons: [] });
    }
    
    const lessons = [];
    snapshot.forEach(doc => {
      lessons.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return res.status(200).json({ lessons });
  } catch (error) {
    console.error('Error getting instructor lessons:', error);
    return res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

// Update a lesson
exports.updateLesson = async (req, res) => {
  try {
    // Lấy instructorId từ token thay vì từ params
    const instructorId = req.user ? req.user.phoneNumber : null;
    const { lessonId } = req.params;
    const updateData = req.body;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor not authenticated' });
    }
    
    if (!lessonId) {
      return res.status(400).json({ error: 'Lesson ID is required' });
    }
    
    // Check if lesson exists and belongs to the instructor
    const lessonRef = db.collection('lessons').doc(lessonId);
    const lessonDoc = await lessonRef.get();
    
    if (!lessonDoc.exists) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const lessonData = lessonDoc.data();
    if (lessonData.instructorId !== instructorId) {
      return res.status(403).json({ error: 'Lesson does not belong to this instructor' });
    }
    
    // If scheduledDate is being updated, convert it to a Date object
    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate);
    }
    
    // Update the lesson document
    await lessonRef.update(updateData);
    
    return res.status(200).json({
      message: 'Lesson updated successfully',
      lesson: {
        id: lessonId,
        ...lessonData,
        ...updateData
      }
    });
  } catch (error) {
    console.error('Error updating lesson:', error);
    return res.status(500).json({ error: 'Failed to update lesson' });
  }
};

// Delete a lesson
exports.deleteLesson = async (req, res) => {
  try {
    // Lấy instructorId từ token thay vì từ params
    const instructorId = req.user ? req.user.phoneNumber : null;
    const { lessonId } = req.params;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor not authenticated' });
    }
    
    if (!lessonId) {
      return res.status(400).json({ error: 'Lesson ID is required' });
    }
    
    // Check if lesson exists and belongs to the instructor
    const lessonRef = db.collection('lessons').doc(lessonId);
    const lessonDoc = await lessonRef.get();
    
    if (!lessonDoc.exists) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const lessonData = lessonDoc.data();
    if (lessonData.instructorId !== instructorId) {
      return res.status(403).json({ error: 'Lesson does not belong to this instructor' });
    }
    
    // Delete the lesson document
    await lessonRef.delete();
    
    return res.status(200).json({
      message: 'Lesson deleted successfully',
      id: lessonId
    });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return res.status(500).json({ error: 'Failed to delete lesson' });
  }
};