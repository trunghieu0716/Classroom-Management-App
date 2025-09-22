# Chat Functionality Test Plan

## Overview

This document outlines the test plan for verifying the real-time chat functionality between students and instructors.

## Prerequisites

1. Backend server running on port 5000
2. Frontend application running on port 5173
3. At least one instructor account
4. At least one student account

## Test Scenarios

### Test Case 1: Socket.io Connection

**Objective**: Verify that Socket.io connection is established correctly.

**Steps**:

1. Open browser developer tools (Network tab)
2. Log in as student
3. Navigate to the Messages tab
4. Check for WebSocket connection in the Network tab

**Expected Result**:

- WebSocket connection should be established
- Console should show "✅ Socket connected with ID: [socket-id]"

### Test Case 2: Student-Instructor Chat Room Creation

**Objective**: Verify that chat rooms are created correctly.

**Steps**:

1. Log in as an instructor
2. Navigate to the Messages tab
3. Check if student list is populated
4. Log in as a student in another browser/incognito window
5. Navigate to the Messages tab
6. Check if instructor appears in the chat list

**Expected Result**:

- Both instructor and student should see each other in their respective chat lists
- Chat rooms should be properly created with unique IDs

### Test Case 3: Message Sending and Receiving

**Objective**: Verify real-time message sending and receiving.

**Steps**:

1. Log in as instructor
2. Navigate to Messages tab
3. Select a student from the list
4. Send a message
5. Log in as that student in another browser
6. Navigate to Messages tab
7. Check if the message from instructor is received
8. Reply to the message
9. Verify that the instructor receives the reply

**Expected Result**:

- Messages should be sent and received in real-time
- Both sides should see the messages immediately
- Message history should be preserved

### Test Case 4: Message Persistence

**Objective**: Verify that messages are persisted in Firebase.

**Steps**:

1. Log in as instructor and send messages to a student
2. Log in as student and reply
3. Log out both accounts
4. Log back in as either user
5. Navigate to Messages tab and select the conversation

**Expected Result**:

- Previous messages should be loaded from Firebase
- All message history should be displayed in correct order

### Test Case 5: Typing Indicators

**Objective**: Verify that typing indicators work correctly.

**Steps**:

1. Log in as instructor and student in separate browsers
2. Open a chat between them
3. Start typing in the instructor's message input
4. Check if typing indicator appears for the student
5. Stop typing and verify indicator disappears

**Expected Result**:

- Typing indicator should appear when one user is typing
- Indicator should disappear after a few seconds of inactivity

### Test Case 6: Read Status

**Objective**: Verify that message read status is updated correctly.

**Steps**:

1. Log in as instructor and send a message to a student
2. Log in as the student but don't open the conversation
3. Check if there is an unread indicator in the chat list
4. Open the conversation
5. Check if the message is marked as read for the instructor

**Expected Result**:

- Unread message count should be displayed in the chat list
- Messages should be marked as read when conversation is opened
- Read status should be updated for the sender

## Edge Cases

### Test Case 7: Disconnection Handling

**Objective**: Verify behavior when network connection is lost.

**Steps**:

1. Open chat between instructor and student
2. Disconnect one user's internet connection
3. Attempt to send messages
4. Reconnect to the internet
5. Check if connection is reestablished

**Expected Result**:

- User should be notified of disconnection
- Messages should be queued or user informed they can't be sent
- Connection should be automatically reestablished when network returns

### Test Case 8: Multiple Devices

**Objective**: Verify that a user can chat from multiple devices.

**Steps**:

1. Log in as the same student on two different browsers/devices
2. Have an instructor send a message
3. Check if both student sessions receive the message
4. Send a reply from one student session
5. Check if it appears in both student sessions and the instructor session

**Expected Result**:

- Messages should sync across all devices for the same user
- Both devices should receive real-time updates

## Test Data

- Instructor account: instructor@example.com
- Student account: student@example.com
- Test messages: "Hello, this is a test message", "How can I help you?", etc.

## Notes

- Make sure to test with different browsers (Chrome, Firefox, Safari)
- Test on both desktop and mobile devices if possible
- Check network tab in developer tools to verify WebSocket communication
