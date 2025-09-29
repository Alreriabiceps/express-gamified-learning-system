// Question Service for fetching real questions from database
const backendUrl = import.meta.env.VITE_BACKEND_URL;

class QuestionService {
  // Fetch all questions from database
  async getAllQuestions() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${backendUrl}/api/questions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.status}`);
      }

      const questions = await response.json();
      console.log(`📚 Fetched ${questions.length} questions from database`);
      return questions;
    } catch (error) {
      console.error("❌ Error fetching questions:", error);
      throw error;
    }
  }

  // Fetch questions by Bloom's level
  async getQuestionsByBloomLevel(bloomLevel) {
    try {
      const allQuestions = await this.getAllQuestions();
      return allQuestions.filter(
        (question) => question.bloomsLevel === bloomLevel
      );
    } catch (error) {
      console.error(`❌ Error fetching questions for ${bloomLevel}:`, error);
      throw error;
    }
  }

  // Get random question for a specific Bloom's level
  async getRandomQuestionByBloomLevel(bloomLevel) {
    try {
      const questions = await this.getQuestionsByBloomLevel(bloomLevel);
      if (questions.length === 0) {
        throw new Error(`No questions found for Bloom's level: ${bloomLevel}`);
      }

      const randomIndex = Math.floor(Math.random() * questions.length);
      return questions[randomIndex];
    } catch (error) {
      console.error(
        `❌ Error getting random question for ${bloomLevel}:`,
        error
      );
      throw error;
    }
  }

  // Transform database question to game format
  transformQuestionToGameFormat(dbQuestion) {
    // Handle empty strings properly - only use truthy values
    const correctAnswer =
      (dbQuestion.correctAnswer && dbQuestion.correctAnswer.trim()) ||
      (dbQuestion.answer && dbQuestion.answer.trim()) ||
      (dbQuestion.correct_answer && dbQuestion.correct_answer.trim()) ||
      (dbQuestion.solution && dbQuestion.solution.trim()) ||
      (dbQuestion.rightAnswer && dbQuestion.rightAnswer.trim()) ||
      (dbQuestion.correctChoice && dbQuestion.correctChoice.trim()) ||
      (dbQuestion.answerKey && dbQuestion.answerKey.trim()) ||
      (dbQuestion.correctOption && dbQuestion.correctOption.trim());

    return {
      id: dbQuestion._id,
      question: dbQuestion.questionText,
      choices: dbQuestion.choices,
      correctAnswer: correctAnswer,
      bloomLevel: dbQuestion.bloomsLevel,
      subject: dbQuestion.subject,
      questionType: dbQuestion.questionType,
      createdAt: dbQuestion.createdAt,
    };
  }

  // Get damage value based on Bloom's level (matching game engine)
  getDamageByBloomLevel(bloomLevel) {
    const damageMap = {
      Remembering: 5,
      Understanding: 10,
      Applying: 15,
      Analyzing: 20,
      Evaluating: 25,
      Creating: 30,
    };
    return damageMap[bloomLevel] || 10;
  }

  // Get color for Bloom's level (matching game engine)
  getColorByBloomLevel(bloomLevel) {
    const colorMap = {
      Remembering: "#9ca3af",
      Understanding: "#60a5fa",
      Applying: "#34d399",
      Analyzing: "#fb923c",
      Evaluating: "#f87171",
      Creating: "#a78bfa",
    };
    return colorMap[bloomLevel] || "#60a5fa";
  }
}

// Create and export singleton instance
const questionService = new QuestionService();
export default questionService;
