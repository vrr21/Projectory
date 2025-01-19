const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRouter = require('./authRouter');
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);

const start = async () => {
  try {
    await mongoose.connect(
        'mongodb+srv://Pross_libr:FZH10HelCYjeUMqv@cluster0.elvtf.mongodb.net/?retryWrites=true&w=majority',
        { useNewUrlParser: true, useUnifiedTopology: true }
      );
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  } catch (e) {
    console.error('Error connecting to database:', e);
  }
};

start();
