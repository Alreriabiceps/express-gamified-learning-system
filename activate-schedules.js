const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";
const ADMIN_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3OGY5YjQ5YjQ5YjQ5YjQ5YjQ5YjQ5IiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczNDcyODAwMCwiZXhwIjoxNzM0NzM2NDAwfQ.test";

async function getAllSchedules() {
  try {
    console.log("🔍 Fetching all week schedules...");
    const response = await axios.get(`${BASE_URL}/weeks`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });

    console.log(`✅ Found ${response.data.length} total schedules`);

    response.data.forEach((schedule, index) => {
      console.log(`  [${index}] ID: ${schedule._id}`);
      console.log(
        `      Subject: ${schedule.subjectId?.subject || "No subject"}`
      );
      console.log(`      Week: ${schedule.weekNumber}`);
      console.log(`      Year: ${schedule.year}`);
      console.log(`      Is Active: ${schedule.isActive}`);
      console.log(`      Questions: ${schedule.questionIds?.length || 0}`);
      console.log("      ---");
    });

    return response.data;
  } catch (error) {
    console.error("❌ Error fetching schedules:", error.message);
    if (error.response) {
      console.error("❌ Response Status:", error.response.status);
      console.error("❌ Response Data:", error.response.data);
    }
    return [];
  }
}

async function activateSchedule(scheduleId) {
  try {
    console.log(`🔄 Activating schedule: ${scheduleId}`);
    const response = await axios.patch(
      `${BASE_URL}/weeks/${scheduleId}/toggle-active`,
      {},
      {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      }
    );

    console.log(`✅ Schedule activated: ${scheduleId}`);
    console.log(`   Subject: ${response.data.subjectId?.subject}`);
    console.log(`   Week: ${response.data.weekNumber}`);
    console.log(`   Is Active: ${response.data.isActive}`);
    return true;
  } catch (error) {
    console.error(`❌ Error activating schedule ${scheduleId}:`, error.message);
    if (error.response) {
      console.error("❌ Response Status:", error.response.status);
      console.error("❌ Response Data:", error.response.data);
    }
    return false;
  }
}

async function main() {
  console.log("🚀 Week Schedule Activation Tool");
  console.log("=".repeat(50));

  // Get all schedules
  const schedules = await getAllSchedules();

  if (schedules.length === 0) {
    console.log(
      "❌ No schedules found. Make sure the server is running and you have valid schedules."
    );
    return;
  }

  // Find inactive schedules
  const inactiveSchedules = schedules.filter((s) => !s.isActive);

  if (inactiveSchedules.length === 0) {
    console.log("✅ All schedules are already active!");
    return;
  }

  console.log(`\n🔍 Found ${inactiveSchedules.length} inactive schedules:`);
  inactiveSchedules.forEach((schedule, index) => {
    console.log(
      `  [${index}] ${schedule.subjectId?.subject} - Week ${schedule.weekNumber} (${schedule.year})`
    );
  });

  console.log("\n🔄 Activating all inactive schedules...");

  let activatedCount = 0;
  for (const schedule of inactiveSchedules) {
    const success = await activateSchedule(schedule._id);
    if (success) {
      activatedCount++;
    }
    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(
    `\n✅ Activation complete! ${activatedCount}/${inactiveSchedules.length} schedules activated.`
  );
  console.log("\n🔄 Refreshing schedule list...");

  // Show updated status
  await getAllSchedules();
}

main().catch(console.error);
