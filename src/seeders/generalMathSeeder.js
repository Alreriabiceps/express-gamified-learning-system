require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../../users/admin/question/models/questionModels');


  const questions = [
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the square root of 144?",
      choices: ["10", "11", "12", "13"],
      correctAnswer: "12"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 25% of 200?",
      choices: ["25", "50", "75", "100"],
      correctAnswer: "50"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the value of π (pi) rounded to two decimal places?",
      choices: ["3.12", "3.14", "3.16", "3.18"],
      correctAnswer: "3.14"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the sum of the angles in a triangle?",
      choices: ["90 degrees", "180 degrees", "270 degrees", "360 degrees"],
      correctAnswer: "180 degrees"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 15 × 4?",
      choices: ["45", "50", "55", "60"],
      correctAnswer: "60"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the next number in the sequence: 2, 4, 8, 16, ___?",
      choices: ["24", "28", "32", "36"],
      correctAnswer: "32"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the area of a rectangle with length 8 and width 5?",
      choices: ["13", "26", "35", "40"],
      correctAnswer: "40"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 3/4 expressed as a decimal?",
      choices: ["0.25", "0.5", "0.75", "1.0"],
      correctAnswer: "0.75"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the value of 5²?",
      choices: ["10", "15", "20", "25"],
      correctAnswer: "25"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the average of 10, 20, and 30?",
      choices: ["15", "20", "25", "30"],
      correctAnswer: "20"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the value of 9 + 6 × 2?",
      choices: ["18", "21", "15", "12"],
      correctAnswer: "21"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 50 ÷ 5?",
      choices: ["5", "10", "15", "20"],
      correctAnswer: "10"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the perimeter of a square with side length 4?",
      choices: ["8", "12", "16", "20"],
      correctAnswer: "16"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 7 × 7?",
      choices: ["49", "56", "42", "63"],
      correctAnswer: "49"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the value of 8³?",
      choices: ["512", "256", "128", "64"],
      correctAnswer: "512"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the square root of 169?",
      choices: ["11", "12", "13", "14"],
      correctAnswer: "13"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the value of 3³?",
      choices: ["27", "18", "9", "6"],
      correctAnswer: "27"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 8 × 12?",
      choices: ["96", "92", "100", "88"],
      correctAnswer: "96"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the volume of a cube with side length 3?",
      choices: ["9", "18", "27", "36"],
      correctAnswer: "27"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the result of 7 ÷ 2?",
      choices: ["3", "3.5", "4", "4.5"],
      correctAnswer: "3.5"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 5 × 5?",
      choices: ["15", "20", "25", "30"],
      correctAnswer: "25"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the value of 36 ÷ 6?",
      choices: ["6", "7", "8", "9"],
      correctAnswer: "6"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the next number in the sequence: 1, 3, 5, 7, ___?",
      choices: ["8", "9", "10", "11"],
      correctAnswer: "9"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the value of 10 + 10 ÷ 2?",
      choices: ["15", "20", "25", "30"],
      correctAnswer: "15"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 45 ÷ 9?",
      choices: ["4", "5", "6", "7"],
      correctAnswer: "5"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the value of 11 × 11?",
      choices: ["121", "111", "122", "100"],
      correctAnswer: "121"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 16 × 3?",
      choices: ["46", "48", "50", "52"],
      correctAnswer: "48"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the sum of the first 10 prime numbers?",
      choices: ["129", "130", "135", "140"],
      correctAnswer: "129"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 10 × 10?",
      choices: ["100", "110", "120", "130"],
      correctAnswer: "100"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the area of a circle with radius 7?",
      choices: ["154", "49π", "44π", "60π"],
      correctAnswer: "49π"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the result of 25 ÷ 5?",
      choices: ["5", "6", "4", "3"],
      correctAnswer: "5"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the perimeter of a rectangle with length 6 and width 8?",
      choices: ["28", "32", "36", "40"],
      correctAnswer: "28"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the value of 18 ÷ 3?",
      choices: ["5", "6", "7", "8"],
      correctAnswer: "6"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 9 × 9?",
      choices: ["72", "81", "90", "99"],
      correctAnswer: "81"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 12 × 12?",
      choices: ["144", "132", "120", "110"],
      correctAnswer: "144"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the square root of 256?",
      choices: ["14", "16", "18", "20"],
      correctAnswer: "16"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 15 + 15?",
      choices: ["25", "30", "35", "40"],
      correctAnswer: "30"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 3 × 5?",
      choices: ["10", "12", "15", "20"],
      correctAnswer: "15"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the area of a triangle with base 4 and height 3?",
      choices: ["6", "12", "15", "20"],
      correctAnswer: "6"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the value of 7 × 3?",
      choices: ["20", "21", "22", "23"],
      correctAnswer: "21"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is 10 × 5?",
      choices: ["40", "50", "60", "70"],
      correctAnswer: "50"
    },
    {
      subject: "680ccf6d84af7139d035048d",
      questionText: "What is the value of 20 ÷ 4?",
      choices: ["4", "5", "6", "7"],
      correctAnswer: "5"
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

    await Question.deleteMany({ subject: "680ccf6d84af7139d035048d" });
    await Question.insertMany(questions);

    console.log('General Math questions seeded successfully');
  } catch (error) {
    console.error('Error seeding questions:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedQuestions(); 