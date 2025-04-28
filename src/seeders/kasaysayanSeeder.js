require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../../users/admin/question/models/questionModels');

const questions = [
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Sino ang unang presidente ng Pilipinas?",
    choices: ["Manuel L. Quezon", "Emilio Aguinaldo", "Jose Rizal", "Andres Bonifacio"],
    correctAnswer: "Emilio Aguinaldo"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Kailan idineklara ang kasarinlan ng Pilipinas?",
    choices: ["June 12, 1898", "July 4, 1946", "March 22, 1897", "January 23, 1899"],
    correctAnswer: "June 12, 1898"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Sino ang tinaguriang 'Ama ng Wikang Pambansa'?",
    choices: ["Jose Rizal", "Manuel L. Quezon", "Andres Bonifacio", "Apolinario Mabini"],
    correctAnswer: "Manuel L. Quezon"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Ano ang tawag sa unang republika ng Pilipinas?",
    choices: ["Republika ng Malolos", "Republika ng Biak-na-Bato", "Republika ng Katagalugan", "Republika ng Pilipinas"],
    correctAnswer: "Republika ng Malolos"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Sino ang nagtatag ng Katipunan?",
    choices: ["Jose Rizal", "Andres Bonifacio", "Emilio Aguinaldo", "Marcelo H. del Pilar"],
    correctAnswer: "Andres Bonifacio"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Ano ang tawag sa kasunduan na nagtapos sa Digmaang Pilipino-Amerikano?",
    choices: ["Kasunduan sa Paris", "Kasunduan sa Biak-na-Bato", "Kasunduan sa Malolos", "Kasunduan sa Tordesillas"],
    correctAnswer: "Kasunduan sa Paris"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Sino ang tinaguriang 'Utak ng Rebolusyon'?",
    choices: ["Emilio Aguinaldo", "Apolinario Mabini", "Jose Rizal", "Andres Bonifacio"],
    correctAnswer: "Apolinario Mabini"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Ano ang tawag sa unang pahayagan ng Katipunan?",
    choices: ["La Solidaridad", "Kalayaan", "El Filibusterismo", "Noli Me Tangere"],
    correctAnswer: "Kalayaan"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Sino ang nagtatag ng La Liga Filipina?",
    choices: ["Marcelo H. del Pilar", "Jose Rizal", "Andres Bonifacio", "Graciano Lopez Jaena"],
    correctAnswer: "Jose Rizal"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Ano ang tawag sa unang konstitusyon ng Pilipinas?",
    choices: ["Konstitusyon ng Malolos", "Konstitusyon ng Biak-na-Bato", "Konstitusyon ng 1935", "Konstitusyon ng 1987"],
    correctAnswer: "Konstitusyon ng Malolos"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Sino ang unang Pilipinong nakapagbigay ng 'Sakramento ng Kasal' sa isang banyaga?",
    choices: ["Marcelo H. del Pilar", "Jose Rizal", "Andres Bonifacio", "Antonio Luna"],
    correctAnswer: "Jose Rizal"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Ano ang pangalan ng unang barko ng Pilipinas na nilunsad?",
    choices: ["RPS Don Juan", "RPS Juan de la Cruz", "RPS Datu Puti", "RPS Rajah Sulayman"],
    correctAnswer: "RPS Don Juan"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Saan nangyari ang Labanan sa Balintawak?",
    choices: ["Tarlac", "Cavite", "Quezon City", "Manila"],
    correctAnswer: "Quezon City"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Ano ang tawag sa organisasyon na nagtataguyod ng kalayaan ng Pilipinas mula sa mga mananakop?",
    choices: ["Kataastaasan Kagalang-galangang Katipunan ng mga Anak ng Bayan", "Katipunan ng mga Mamamayan", "Sakramento ng Katipunan", "Samahang Katipunan"],
    correctAnswer: "Kataastaasan Kagalang-galangang Katipunan ng mga Anak ng Bayan"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Kailan pinangunahan ni Emilio Aguinaldo ang pagdeklara ng kalayaan ng Pilipinas?",
    choices: ["June 12, 1898", "December 30, 1898", "March 25, 1897", "November 29, 1898"],
    correctAnswer: "June 12, 1898"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Ano ang pangalan ng unang konstitusyon ng Pilipinas?",
    choices: ["Konstitusyon ng Malolos", "Konstitusyon ng Biak-na-Bato", "Konstitusyon ng 1935", "Konstitusyon ng 1987"],
    correctAnswer: "Konstitusyon ng Malolos"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Sino ang unang babae sa Pilipinas na naging isang opisyal ng gobyerno?",
    choices: ["Corazon Aquino", "Gabriela Silang", "Luna Binay", "Melchora Aquino"],
    correctAnswer: "Gabriela Silang"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Ano ang itinuring na pinakaunang himagsikan laban sa mga Kastila?",
    choices: ["The Battle of Pinaglabanan", "Battle of Manila", "Battle of Ternate", "Battle of Mactan"],
    correctAnswer: "The Battle of Pinaglabanan"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Saan ipinanganak si Andres Bonifacio?",
    choices: ["Tondo, Manila", "Cavite", "Batangas", "Pangasinan"],
    correctAnswer: "Tondo, Manila"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Sino ang tinaguriang 'Heneral ng Bayan'?",
    choices: ["Emilio Aguinaldo", "Antonio Luna", "Gregorio del Pilar", "Juan Luna"],
    correctAnswer: "Antonio Luna"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Ano ang pangalan ng pinakaunang bahay-bahayan sa Pilipinas?",
    choices: ["Casa de Bonifacio", "Kubo ng Mabini", "Bahay ni Aguinaldo", "Casa de Rizal"],
    correctAnswer: "Casa de Bonifacio"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Ano ang pangalan ng pinakaunang aklat sa Pilipinas na isinulat ni Jose Rizal?",
    choices: ["El Filibusterismo", "Noli Me Tangere", "La Solidaridad", "Mga Pagwawalang Bansa"],
    correctAnswer: "Noli Me Tangere"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Sino ang unang Pilipinong nakatanggap ng 'Medalya ng Kagalang-galangang Heneral' mula sa isang banyaga?",
    choices: ["Jose Rizal", "Andres Bonifacio", "Antonio Luna", "Emilio Aguinaldo"],
    correctAnswer: "Emilio Aguinaldo"
  },
  {
    subject: "680ccf7684af7139d035048f",
    questionText: "Ano ang pangarap ni Rizal para sa Pilipinas?",
    choices: ["Kalayaan at Kasarinlan", "Pagkakaroon ng Pagkain", "Pagiging isang makapangyarihan", "Pagkakaroon ng edukasyon"],
    correctAnswer: "Kalayaan at Kasarinlan"
  },
  // Add more questions here to reach 50
];



const seedQuestions = async () => {
  try {
    console.log('Connecting to MongoDB with URI:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    await Question.deleteMany({ subject: "680ccf7684af7139d035048f" });
    await Question.insertMany(questions);

    console.log('Pag-aaral ng Kasaysayan questions seeded successfully');
  } catch (error) {
    console.error('Error seeding questions:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedQuestions(); 