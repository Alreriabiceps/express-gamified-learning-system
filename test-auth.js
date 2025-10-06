/**
 * Quick authentication test script
 * Tests the 3 main authentication scenarios
 */

const axios = require("axios");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const API_URL = `${BACKEND_URL}/api/auth`;

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

// Test Case 1: Student Login with correct credentials
async function testStudentLogin() {
  log.info("Test Case 1: Student Login (Valid Credentials)");
  try {
    const response = await axios.post(`${API_URL}/student-login`, {
      studentId: 12345, // Replace with actual test student ID
      password: "password123", // Replace with actual test password
    });

    if (
      response.status === 200 &&
      response.data.token &&
      response.data.student
    ) {
      log.success("Student login successful - Returns token and student data");
      log.success("Expected: Show Student Dashboard ✓");
      return true;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      log.warn("Test student not found. Please create a test student first.");
      log.info("You can register at: /api/auth/student-register");
    } else {
      log.error(
        `Student login failed: ${error.response?.data?.error || error.message}`
      );
    }
    return false;
  }
}

// Test Case 2: Admin Login with correct credentials
async function testAdminLogin() {
  log.info("\nTest Case 2: Admin Login (Valid Credentials)");
  try {
    const response = await axios.post(`${API_URL}/admin-login`, {
      username: "admin", // Replace with actual admin username
      password: "admin123", // Replace with actual admin password
    });

    if (response.status === 200 && response.data.token && response.data.admin) {
      log.success("Admin login successful - Returns token and admin data");
      log.success("Expected: Show Admin Dashboard ✓");
      return true;
    }
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 404) {
      log.warn("Admin credentials incorrect or not found.");
      log.info("You may need to create an admin using: npm run create-admin");
    } else {
      log.error(
        `Admin login failed: ${error.response?.data?.error || error.message}`
      );
    }
    return false;
  }
}

// Test Case 3: Invalid Login with incorrect credentials
async function testInvalidLogin() {
  log.info("\nTest Case 3: Invalid Login (Incorrect Credentials)");
  let allPassed = true;

  // Test invalid student login
  try {
    await axios.post(`${API_URL}/student-login`, {
      studentId: 99999,
      password: "wrongpassword",
    });
    log.error("Invalid student login should have failed but succeeded");
    allPassed = false;
  } catch (error) {
    if (error.response?.status === 401) {
      log.success("Invalid student login correctly rejected with 401");
      log.success("Expected: Show error message ✓");
    } else {
      log.error(
        `Unexpected error: ${error.response?.data?.error || error.message}`
      );
      allPassed = false;
    }
  }

  // Test invalid admin login
  try {
    await axios.post(`${API_URL}/admin-login`, {
      username: "invaliduser",
      password: "wrongpassword",
    });
    log.error("Invalid admin login should have failed but succeeded");
    allPassed = false;
  } catch (error) {
    if (error.response?.status === 401) {
      log.success("Invalid admin login correctly rejected with 401");
      log.success("Expected: Show error message ✓");
    } else {
      log.error(
        `Unexpected error: ${error.response?.data?.error || error.message}`
      );
      allPassed = false;
    }
  }

  return allPassed;
}

// Test response time
async function testLoginSpeed() {
  log.info("\nPerformance Test: Login Speed");

  try {
    const start = Date.now();
    await axios
      .post(`${API_URL}/admin-login`, {
        username: "test",
        password: "test",
      })
      .catch(() => {}); // Ignore errors, just testing speed

    const duration = Date.now() - start;

    if (duration < 500) {
      log.success(`Login response time: ${duration}ms (Fast ✓)`);
    } else if (duration < 1000) {
      log.warn(`Login response time: ${duration}ms (Acceptable)`);
    } else {
      log.error(`Login response time: ${duration}ms (Too slow!)`);
    }
  } catch (error) {
    log.error("Could not test login speed");
  }
}

// Main test runner
async function runTests() {
  console.log("\n" + "=".repeat(50));
  console.log("  AUTHENTICATION MODULE TEST SUITE");
  console.log("=".repeat(50) + "\n");

  log.info(`Testing against: ${API_URL}\n`);

  const results = {
    studentLogin: await testStudentLogin(),
    adminLogin: await testAdminLogin(),
    invalidLogin: await testInvalidLogin(),
  };

  await testLoginSpeed();

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("  TEST SUMMARY");
  console.log("=".repeat(50));

  const passed = Object.values(results).filter((r) => r).length;
  const total = Object.keys(results).length;

  console.log(`\nTests Passed: ${passed}/${total}`);

  if (passed === total) {
    log.success("\nAll authentication tests passed! ✓\n");
  } else {
    log.warn("\nSome tests failed or need configuration.\n");
    log.info("Setup Instructions:");
    log.info("1. Make sure the backend server is running");
    log.info("2. Create a test student via registration");
    log.info("3. Create an admin using: npm run create-admin");
    log.info("4. Update test credentials in this file if needed\n");
  }

  console.log("=".repeat(50) + "\n");
}

// Run tests
runTests().catch((error) => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});


