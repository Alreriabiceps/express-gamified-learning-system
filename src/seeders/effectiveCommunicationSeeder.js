require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../../users/admin/question/models/questionModels');

const questions = [
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is the most important aspect of effective communication?",
    choices: ["Speaking clearly", "Active listening", "Using complex vocabulary", "Speaking quickly"],
    correctAnswer: "Active listening"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "Which of these is a non-verbal communication skill?",
    choices: ["Speaking tone", "Body language", "Vocabulary choice", "Sentence structure"],
    correctAnswer: "Body language"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is the purpose of feedback in communication?",
    choices: ["To criticize", "To confirm understanding", "To show superiority", "To interrupt"],
    correctAnswer: "To confirm understanding"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "Which communication style is most effective in resolving conflicts?",
    choices: ["Aggressive", "Passive", "Assertive", "Avoidant"],
    correctAnswer: "Assertive"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is the role of empathy in communication?",
    choices: ["To manipulate others", "To understand others' feelings", "To win arguments", "To avoid responsibility"],
    correctAnswer: "To understand others' feelings"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "Which of these is a barrier to effective communication?",
    choices: ["Active listening", "Clear language", "Cultural differences", "Eye contact"],
    correctAnswer: "Cultural differences"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is the purpose of paraphrasing in communication?",
    choices: ["To confuse the listener", "To show off vocabulary", "To ensure understanding", "To change the subject"],
    correctAnswer: "To ensure understanding"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "Which of these is an example of active listening?",
    choices: ["Interrupting to share your opinion", "Nodding and maintaining eye contact", "Thinking about your response while the other person is talking", "Checking your phone"],
    correctAnswer: "Nodding and maintaining eye contact"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is the importance of tone in communication?",
    choices: ["It doesn't matter", "It can change the meaning of words", "It's only important in formal settings", "It's only important in writing"],
    correctAnswer: "It can change the meaning of words"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "Which of these is a key element of effective public speaking?",
    choices: ["Speaking as fast as possible", "Using complex jargon", "Maintaining eye contact with the audience", "Reading directly from notes"],
    correctAnswer: "Maintaining eye contact with the audience"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is a characteristic of good body language?",
    choices: ["Crossing arms", "Nodding while listening", "Avoiding eye contact", "Fidgeting with hands"],
    correctAnswer: "Nodding while listening"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "Which of the following is a sign of a strong communicator?",
    choices: ["Talking over others", "Staying silent during conversations", "Listening actively", "Interrupting often"],
    correctAnswer: "Listening actively"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "How can one improve their communication skills?",
    choices: ["By speaking more loudly", "By avoiding eye contact", "By practicing active listening", "By talking in complex sentences"],
    correctAnswer: "By practicing active listening"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "Why is emotional intelligence important in communication?",
    choices: ["It helps in reading others' body language", "It allows better control over emotions", "It helps in understanding feelings", "All of the above"],
    correctAnswer: "All of the above"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What does non-verbal communication include?",
    choices: ["Text messages", "Facial expressions", "Written letters", "Emails"],
    correctAnswer: "Facial expressions"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "How should feedback be delivered?",
    choices: ["In a harsh and direct manner", "In a clear, constructive way", "With sarcasm", "By ignoring the person's feelings"],
    correctAnswer: "In a clear, constructive way"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What does active listening involve?",
    choices: ["Focusing on your response", "Listening attentively and without distractions", "Interrupting to share your thoughts", "Daydreaming while the person talks"],
    correctAnswer: "Listening attentively and without distractions"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "Which of these is an example of passive listening?",
    choices: ["Repeating what was said", "Avoiding eye contact", "Focusing on the speaker", "Nodding in agreement"],
    correctAnswer: "Avoiding eye contact"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What should you do when you don’t understand something during a conversation?",
    choices: ["Ignore it", "Ask for clarification", "Guess the meaning", "Pretend you understand"],
    correctAnswer: "Ask for clarification"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "Which communication style promotes mutual respect?",
    choices: ["Aggressive", "Assertive", "Passive", "Avoidant"],
    correctAnswer: "Assertive"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What does the 'feedback loop' refer to in communication?",
    choices: ["The process of giving and receiving feedback", "The time it takes for communication to occur", "The types of communication channels used", "The silence between two speakers"],
    correctAnswer: "The process of giving and receiving feedback"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is an example of a communication barrier?",
    choices: ["Clear messages", "Emotional barriers", "Open dialogue", "Active listening"],
    correctAnswer: "Emotional barriers"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "How can one manage communication during a conflict?",
    choices: ["By staying calm and focused", "By yelling to make your point clear", "By interrupting the other speaker", "By leaving the conversation"],
    correctAnswer: "By staying calm and focused"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is the role of silence in communication?",
    choices: ["It is always negative", "It can create discomfort", "It can be used to think and reflect", "It has no role"],
    correctAnswer: "It can be used to think and reflect"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What does 'active listening' help improve?",
    choices: ["Memory retention", "Understanding", "Empathy", "All of the above"],
    correctAnswer: "All of the above"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What does verbal communication include?",
    choices: ["Gestures", "Written messages", "Talking", "Tone of voice"],
    correctAnswer: "Talking"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "How can one avoid miscommunication?",
    choices: ["By speaking quickly", "By using simple language", "By avoiding eye contact", "By being vague"],
    correctAnswer: "By using simple language"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is one benefit of good communication?",
    choices: ["It reduces stress", "It makes people talk less", "It causes confusion", "It limits interactions"],
    correctAnswer: "It reduces stress"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is an essential part of good communication in teams?",
    choices: ["Assigning tasks without explanation", "Listening to everyone’s ideas", "Interrupting others when necessary", "Speaking only when spoken to"],
    correctAnswer: "Listening to everyone’s ideas"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "How can tone of voice affect communication?",
    choices: ["It can change the meaning of a message", "It makes no difference", "It only matters in formal settings", "It only applies to written communication"],
    correctAnswer: "It can change the meaning of a message"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "Why is body language important in communication?",
    choices: ["It is irrelevant", "It provides additional context", "It replaces verbal communication", "It confuses the listener"],
    correctAnswer: "It provides additional context"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What does 'listening to understand' mean?",
    choices: ["Listening with the intent to reply", "Listening without distractions", "Listening with the intent to agree", "Listening with the intent to judge"],
    correctAnswer: "Listening without distractions"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is an example of an assertive communication behavior?",
    choices: ["Saying 'no' without guilt", "Yelling at someone", "Ignoring others' feelings", "Agreeing to everything others say"],
    correctAnswer: "Saying 'no' without guilt"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What role does clarity play in communication?",
    choices: ["It reduces misunderstandings", "It creates confusion", "It limits interaction", "It makes the conversation longer"],
    correctAnswer: "It reduces misunderstandings"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "What is one way to improve written communication?",
    choices: ["Using slang", "Writing in long paragraphs", "Being clear and concise", "Avoiding punctuation"],
    correctAnswer: "Being clear and concise"
  },
  {
    subject: "680ccf6184af7139d0350489",
    questionText: "Why is listening important in communication?",
    choices: ["It allows the speaker to finish their thought", "It shows respect and understanding", "It is optional", "It makes the conversation shorter"],
    correctAnswer: "It shows respect and understanding"
  }
];


const seedQuestions = async () => {
  try {
    console.log('Connecting to MongoDB with URI:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    await Question.deleteMany({ subject: "680ccf6184af7139d0350489" });
    await Question.insertMany(questions);

    console.log('Effective Communication questions seeded successfully');
  } catch (error) {
    console.error('Error seeding questions:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedQuestions(); 