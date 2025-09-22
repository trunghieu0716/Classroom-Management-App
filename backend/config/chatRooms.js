/**
 * Cấu hình phòng chat đơn giản
 * Sử dụng ID cố định cho phòng chat của từng loại người dùng
 */

// ID giáo viên cố định trong hệ thống
const INSTRUCTOR_ID = '+84943554223';

// Phòng chat chung cho giáo viên và tất cả học viên
const INSTRUCTOR_ROOM = 'chat_instructor_all';

// Phòng chat cho từng học viên cụ thể (thêm ID học viên vào cuối)
const getStudentRoomId = (studentId) => `chat_student_${studentId}`;

module.exports = {
  INSTRUCTOR_ID,
  INSTRUCTOR_ROOM,
  getStudentRoomId
};