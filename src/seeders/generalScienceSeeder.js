require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../../users/admin/question/models/questionModels');

const questions = [
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the chemical symbol for water?",
    choices: ["H2O", "CO2", "O2", "N2"],
    correctAnswer: "H2O"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which planet is known as the Red Planet?",
    choices: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: "Mars"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the process by which plants make their own food?",
    choices: ["Respiration", "Photosynthesis", "Digestion", "Transpiration"],
    correctAnswer: "Photosynthesis"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is a renewable energy source?",
    choices: ["Coal", "Natural Gas", "Solar Power", "Oil"],
    correctAnswer: "Solar Power"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the largest organ in the human body?",
    choices: ["Heart", "Liver", "Skin", "Brain"],
    correctAnswer: "Skin"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is a greenhouse gas?",
    choices: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Helium"],
    correctAnswer: "Carbon Dioxide"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the basic unit of life?",
    choices: ["Atom", "Molecule", "Cell", "Tissue"],
    correctAnswer: "Cell"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is a non-renewable resource?",
    choices: ["Wind", "Sunlight", "Fossil Fuels", "Water"],
    correctAnswer: "Fossil Fuels"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the process of water turning into vapor called?",
    choices: ["Condensation", "Evaporation", "Precipitation", "Transpiration"],
    correctAnswer: "Evaporation"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is a primary color of light?",
    choices: ["Red", "Green", "Blue", "All of the above"],
    correctAnswer: "All of the above"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the chemical symbol for oxygen?",
    choices: ["O", "O2", "O3", "O4"],
    correctAnswer: "O2"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which gas do plants absorb from the air during photosynthesis?",
    choices: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
    correctAnswer: "Carbon Dioxide"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the largest planet in our solar system?",
    choices: ["Earth", "Mars", "Jupiter", "Saturn"],
    correctAnswer: "Jupiter"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is not a part of the human digestive system?",
    choices: ["Stomach", "Lungs", "Liver", "Intestines"],
    correctAnswer: "Lungs"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which element is most abundant in the Earth's crust?",
    choices: ["Oxygen", "Silicon", "Aluminum", "Iron"],
    correctAnswer: "Oxygen"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What type of rock is formed from lava or magma?",
    choices: ["Sedimentary", "Metamorphic", "Igneous", "All of the above"],
    correctAnswer: "Igneous"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the most common gas in the Earth's atmosphere?",
    choices: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"],
    correctAnswer: "Nitrogen"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What type of animal is a dolphin?",
    choices: ["Fish", "Mammal", "Amphibian", "Reptile"],
    correctAnswer: "Mammal"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is not a type of muscle in the human body?",
    choices: ["Skeletal", "Smooth", "Cardiac", "Nervous"],
    correctAnswer: "Nervous"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the smallest bone in the human body?",
    choices: ["Stapes", "Malleus", "Incus", "Femur"],
    correctAnswer: "Stapes"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is an example of a nonmetal element?",
    choices: ["Iron", "Carbon", "Copper", "Gold"],
    correctAnswer: "Carbon"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the boiling point of water in Celsius?",
    choices: ["50°C", "100°C", "150°C", "200°C"],
    correctAnswer: "100°C"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the process by which plants lose water through their leaves?",
    choices: ["Evaporation", "Condensation", "Transpiration", "Absorption"],
    correctAnswer: "Transpiration"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the main source of energy for the Earth's climate?",
    choices: ["The Moon", "The Sun", "Volcanoes", "Wind"],
    correctAnswer: "The Sun"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these animals is cold-blooded?",
    choices: ["Fish", "Bird", "Mammal", "Reptile"],
    correctAnswer: "Reptile"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the chemical formula for methane?",
    choices: ["CH4", "C2H6", "CO2", "H2O"],
    correctAnswer: "CH4"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is an example of a predator?",
    choices: ["Lion", "Elephant", "Cow", "Deer"],
    correctAnswer: "Lion"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the study of the Earth's physical structure called?",
    choices: ["Geology", "Astronomy", "Meteorology", "Biology"],
    correctAnswer: "Geology"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the chemical symbol for sodium?",
    choices: ["Na", "K", "Mg", "Ca"],
    correctAnswer: "Na"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is a mammal?",
    choices: ["Shark", "Lizard", "Whale", "Squid"],
    correctAnswer: "Whale"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these gases is essential for respiration?",
    choices: ["Carbon Dioxide", "Oxygen", "Nitrogen", "Argon"],
    correctAnswer: "Oxygen"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the hardest natural substance on Earth?",
    choices: ["Gold", "Diamond", "Iron", "Platinum"],
    correctAnswer: "Diamond"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the process of converting a solid directly into a gas called?",
    choices: ["Melting", "Evaporation", "Sublimation", "Condensation"],
    correctAnswer: "Sublimation"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is an example of a carnivore?",
    choices: ["Rabbit", "Lion", "Cow", "Elephant"],
    correctAnswer: "Lion"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which organ pumps blood throughout the human body?",
    choices: ["Heart", "Liver", "Kidneys", "Brain"],
    correctAnswer: "Heart"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the process by which water vapor turns into liquid water?",
    choices: ["Evaporation", "Condensation", "Transpiration", "Absorption"],
    correctAnswer: "Condensation"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which is the smallest planet in our solar system?",
    choices: ["Mercury", "Venus", "Earth", "Mars"],
    correctAnswer: "Mercury"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is a product of photosynthesis?",
    choices: ["Oxygen", "Carbon Dioxide", "Glucose", "Both Oxygen and Glucose"],
    correctAnswer: "Both Oxygen and Glucose"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the force that pulls objects toward the Earth?",
    choices: ["Magnetism", "Electromagnetism", "Gravity", "Friction"],
    correctAnswer: "Gravity"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the main function of the white blood cells?",
    choices: ["Transport oxygen", "Fight infections", "Digest food", "Regulate body temperature"],
    correctAnswer: "Fight infections"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is not a type of rock?",
    choices: ["Basalt", "Marble", "Granite", "Plastic"],
    correctAnswer: "Plastic"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which is the main gas responsible for global warming?",
    choices: ["Carbon Dioxide", "Oxygen", "Methane", "Nitrogen"],
    correctAnswer: "Carbon Dioxide"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which part of the plant is responsible for photosynthesis?",
    choices: ["Roots", "Stem", "Leaves", "Flowers"],
    correctAnswer: "Leaves"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "What is the energy stored in food called?",
    choices: ["Kinetic Energy", "Potential Energy", "Chemical Energy", "Thermal Energy"],
    correctAnswer: "Chemical Energy"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is not a type of blood vessel?",
    choices: ["Artery", "Vein", "Capillary", "Nerve"],
    correctAnswer: "Nerve"
  },
  {
    subject: "680ccf6884af7139d035048b",
    questionText: "Which of these is an example of a sedimentary rock?",
    choices: ["Basalt", "Granite", "Limestone", "Marble"],
    correctAnswer: "Limestone"
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

    await Question.deleteMany({ subject: "680ccf6884af7139d035048b" });
    await Question.insertMany(questions);

    console.log('General Science questions seeded successfully');
  } catch (error) {
    console.error('Error seeding questions:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedQuestions(); 