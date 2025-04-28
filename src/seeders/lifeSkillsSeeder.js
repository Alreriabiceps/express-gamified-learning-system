require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../../users/admin/question/models/questionModels');

const questions = [
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is the first step in creating a budget?",
    choices: ["Spending all your money", "Tracking your income", "Taking out loans", "Ignoring expenses"],
    correctAnswer: "Tracking your income"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "Which of these is an example of good time management?",
    choices: ["Procrastinating", "Creating a schedule", "Multitasking everything", "Working without breaks"],
    correctAnswer: "Creating a schedule"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is the most important aspect of maintaining good health?",
    choices: ["Eating only junk food", "Regular exercise", "Staying up late", "Skipping meals"],
    correctAnswer: "Regular exercise"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "Which of these is a good way to handle stress?",
    choices: ["Ignoring it", "Deep breathing exercises", "Overeating", "Avoiding sleep"],
    correctAnswer: "Deep breathing exercises"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is the first step in conflict resolution?",
    choices: ["Yelling", "Active listening", "Walking away", "Blaming others"],
    correctAnswer: "Active listening"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "Which of these is a good way to build self-confidence?",
    choices: ["Comparing yourself to others", "Setting realistic goals", "Avoiding challenges", "Seeking constant approval"],
    correctAnswer: "Setting realistic goals"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is the most important aspect of maintaining relationships?",
    choices: ["Constant communication", "Ignoring problems", "Avoiding contact", "Being controlling"],
    correctAnswer: "Constant communication"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "Which of these is a good way to improve decision-making skills?",
    choices: ["Acting impulsively", "Weighing pros and cons", "Following others blindly", "Ignoring consequences"],
    correctAnswer: "Weighing pros and cons"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is the best way to handle failure?",
    choices: ["Giving up", "Learning from mistakes", "Blaming others", "Avoiding challenges"],
    correctAnswer: "Learning from mistakes"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "Which of these is a good way to maintain work-life balance?",
    choices: ["Working 24/7", "Setting boundaries", "Ignoring personal life", "Avoiding breaks"],
    correctAnswer: "Setting boundaries"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is an important step in improving communication skills?",
    choices: ["Interrupting others", "Listening actively", "Talking nonstop", "Ignoring feedback"],
    correctAnswer: "Listening actively"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "Which of these helps in setting realistic goals?",
    choices: ["Making impossible targets", "Being specific and measurable", "Avoiding challenges", "Setting vague goals"],
    correctAnswer: "Being specific and measurable"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is the most important trait of a good leader?",
    choices: ["Being controlling", "Listening to others", "Micromanaging", "Avoiding responsibility"],
    correctAnswer: "Listening to others"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is a key component of time management?",
    choices: ["Procrastination", "Prioritizing tasks", "Multitasking", "Avoiding planning"],
    correctAnswer: "Prioritizing tasks"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "Which of these is a good method for managing finances?",
    choices: ["Spending without a plan", "Creating a financial plan", "Ignoring expenses", "Avoiding savings"],
    correctAnswer: "Creating a financial plan"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is a healthy way to deal with frustration?",
    choices: ["Taking it out on others", "Deep breathing", "Ignoring it", "Holding grudges"],
    correctAnswer: "Deep breathing"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is one key to effective problem-solving?",
    choices: ["Avoiding the issue", "Identifying the root cause", "Ignoring the facts", "Being reactive"],
    correctAnswer: "Identifying the root cause"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "How can you stay motivated to achieve your goals?",
    choices: ["Avoiding hard work", "Setting small, achievable steps", "Procrastinating", "Ignoring your goals"],
    correctAnswer: "Setting small, achievable steps"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "Which of these is a key factor in maintaining mental health?",
    choices: ["Ignoring emotions", "Seeking support when needed", "Staying isolated", "Avoiding relaxation"],
    correctAnswer: "Seeking support when needed"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is one effective way to manage a team?",
    choices: ["Micromanaging tasks", "Trusting your team members", "Ignoring feedback", "Avoiding delegation"],
    correctAnswer: "Trusting your team members"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What should you do when feeling overwhelmed?",
    choices: ["Take on more tasks", "Take a break and relax", "Ignore your feelings", "Work harder without rest"],
    correctAnswer: "Take a break and relax"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is the first step in improving decision-making?",
    choices: ["Making decisions on the spot", "Considering all options", "Ignoring feedback", "Avoiding any risks"],
    correctAnswer: "Considering all options"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is a common way to improve productivity?",
    choices: ["Working longer hours without breaks", "Using time-blocking techniques", "Ignoring deadlines", "Multitasking everything"],
    correctAnswer: "Using time-blocking techniques"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "Which of these is a healthy way to build resilience?",
    choices: ["Avoiding challenges", "Staying positive and persistent", "Ignoring problems", "Giving up easily"],
    correctAnswer: "Staying positive and persistent"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "How can you enhance your creativity?",
    choices: ["Avoiding new experiences", "Trying new things and exploring", "Sticking to the same routine", "Limiting inspiration sources"],
    correctAnswer: "Trying new things and exploring"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is one good way to deal with procrastination?",
    choices: ["Delaying tasks indefinitely", "Breaking tasks into smaller steps", "Avoiding tasks", "Ignoring deadlines"],
    correctAnswer: "Breaking tasks into smaller steps"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is an important aspect of emotional intelligence?",
    choices: ["Ignoring emotions", "Being aware of your emotions and others'", "Avoiding conflicts", "Pretending everything is fine"],
    correctAnswer: "Being aware of your emotions and others'"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What should you do to stay productive while working from home?",
    choices: ["Work in your pajamas all day", "Set up a designated workspace", "Ignore your schedule", "Work without breaks"],
    correctAnswer: "Set up a designated workspace"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "How can you stay focused while studying?",
    choices: ["Study with distractions", "Take regular breaks", "Work non-stop", "Ignore any distractions"],
    correctAnswer: "Take regular breaks"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is the best way to approach a difficult task?",
    choices: ["Avoid it", "Break it down into smaller tasks", "Procrastinate", "Work on it last minute"],
    correctAnswer: "Break it down into smaller tasks"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is an important way to stay organized?",
    choices: ["Losing track of tasks", "Using lists and calendars", "Ignoring deadlines", "Multitasking constantly"],
    correctAnswer: "Using lists and calendars"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is the best way to stay motivated during challenging times?",
    choices: ["Give up quickly", "Set a long-term goal and focus on it", "Ignore obstacles", "Procrastinate"],
    correctAnswer: "Set a long-term goal and focus on it"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "What is one of the best ways to achieve financial freedom?",
    choices: ["Living beyond your means", "Saving and investing wisely", "Avoiding savings", "Taking on unnecessary debt"],
    correctAnswer: "Saving and investing wisely"
  },
  {
    subject: "680e1d4e72ddff12503c5feb",
    questionText: "How can you avoid burnout at work?",
    choices: ["Ignoring rest", "Setting clear work-life boundaries", "Taking on too many responsibilities", "Avoiding breaks"],
    correctAnswer: "Setting clear work-life boundaries"
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

    await Question.deleteMany({ subject: "680e1d4e72ddff12503c5feb" });
    await Question.insertMany(questions);

    console.log('Life Skills questions seeded successfully');
  } catch (error) {
    console.error('Error seeding questions:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedQuestions(); 