const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";
const ADMIN_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3OGY5YjQ5YjQ5YjQ5YjQ5YjQ5YjQ5IiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczNDcyODAwMCwiZXhwIjoxNzM0NzM2NDAwfQ.test";

async function testQuestionsAPI() {
  console.log("🧪 Testing Questions API");
  console.log("=".repeat(50));

  try {
    // First, get all subjects to see what's available
    console.log("🔍 Fetching all subjects...");
    const subjectsResponse = await axios.get(`${BASE_URL}/subjects`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });

    console.log(`✅ Found ${subjectsResponse.data.length} subjects:`);
    subjectsResponse.data.forEach((subject, index) => {
      console.log(`  [${index}] ID: ${subject._id}`);
      console.log(`      Name: ${subject.subject}`);
      console.log("      ---");
    });

    // Test getting all questions
    console.log("\n🔍 Fetching all questions...");
    const allQuestionsResponse = await axios.get(`${BASE_URL}/questions`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });

    console.log(`✅ Found ${allQuestionsResponse.data.length} total questions`);

    // Group questions by subject
    const questionsBySubject = {};
    allQuestionsResponse.data.forEach((question) => {
      const subjectId = question.subject?._id || question.subject;
      const subjectName = question.subject?.subject || "Unknown";

      if (!questionsBySubject[subjectId]) {
        questionsBySubject[subjectId] = {
          name: subjectName,
          count: 0,
          questions: [],
        };
      }

      questionsBySubject[subjectId].count++;
      questionsBySubject[subjectId].questions.push({
        id: question._id,
        text: question.questionText?.substring(0, 50) + "...",
        bloomsLevel: question.bloomsLevel,
      });
    });

    console.log("\n📊 Questions by subject:");
    Object.entries(questionsBySubject).forEach(([subjectId, data]) => {
      console.log(`  Subject: ${data.name} (${subjectId})`);
      console.log(`  Questions: ${data.count}`);
      if (data.count > 0) {
        console.log(`  Sample questions:`);
        data.questions.slice(0, 3).forEach((q) => {
          console.log(`    - ${q.text} [${q.bloomsLevel}]`);
        });
      }
      console.log("  ---");
    });

    // Test specific subject queries
    console.log("\n🔍 Testing specific subject queries...");
    for (const subject of subjectsResponse.data) {
      try {
        const subjectQuestionsResponse = await axios.get(
          `${BASE_URL}/questions/${subject._id}`,
          {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          }
        );

        console.log(
          `✅ Subject "${subject.subject}" (${subject._id}): ${subjectQuestionsResponse.data.length} questions`
        );

        if (subjectQuestionsResponse.data.length > 0) {
          console.log(
            `  Sample question: ${subjectQuestionsResponse.data[0].questionText?.substring(
              0,
              50
            )}...`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error fetching questions for subject "${subject.subject}":`,
          error.message
        );
        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Data: ${JSON.stringify(error.response.data)}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error testing questions API:", error.message);
    if (error.response) {
      console.error("❌ Response Status:", error.response.status);
      console.error("❌ Response Data:", error.response.data);
    }
  }
}

testQuestionsAPI().catch(console.error);
