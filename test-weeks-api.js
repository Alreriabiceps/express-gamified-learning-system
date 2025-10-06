const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";
const STUDENT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3OGY5YjQ5YjQ5YjQ5YjQ5YjQ5YjQ5Iiwic3R1ZGVudElkIjoiUzAwMDAwMSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzM0NzI4MDAwLCJleHAiOjE3MzQ3MzY0MDB9.test";

async function testWeeksAPI() {
  console.log("🧪 Testing /api/weeks/active endpoint");
  console.log("=".repeat(50));

  try {
    const response = await axios.get(`${BASE_URL}/weeks/active`, {
      headers: { Authorization: `Bearer ${STUDENT_TOKEN}` },
    });

    console.log("✅ Response Status:", response.status);
    console.log("✅ Response Headers:", response.headers);
    console.log("✅ Response Data Type:", typeof response.data);
    console.log(
      "✅ Response Data Length:",
      Array.isArray(response.data) ? response.data.length : "Not an array"
    );

    if (Array.isArray(response.data)) {
      console.log("✅ Response Data (Array):");
      response.data.forEach((item, index) => {
        console.log(`  [${index}] ID: ${item._id}`);
        console.log(
          `      Subject ID: ${item.subjectId?._id || item.subjectId}`
        );
        console.log(
          `      Subject Name: ${item.subjectId?.subject || "No subject name"}`
        );
        console.log(`      Week Number: ${item.weekNumber}`);
        console.log(`      Year: ${item.year}`);
        console.log(`      Is Active: ${item.isActive}`);
        console.log(`      Question Count: ${item.questionIds?.length || 0}`);
        console.log("      ---");
      });
    } else {
      console.log("❌ Response Data (Not Array):", response.data);
    }
  } catch (error) {
    console.error("❌ Error testing weeks API:", error.message);
    if (error.response) {
      console.error("❌ Response Status:", error.response.status);
      console.error("❌ Response Data:", error.response.data);
    }
  }
}

testWeeksAPI().catch(console.error);
