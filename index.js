const express = require('express');
const cors = require('cors');

const propertyRouter = require('./routes/propertyRoutes');
const userRouter = require('./routes/userRoutes');
const authRouter = require('./routes/authRoutes');
const leadsRouter = require('./routes/leadsRoutes');
const localityRouter = require('./routes/localityRoutes');
const builderRouter = require('./routes/builderRoutes');

const app = express();

app.use(express.json());


const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:5174',
   'http://localhost:5175', 
  'https://df01-110-235-236-218.ngrok-free.app', 
];


const corsOptions = {
  origin: function (origin, callback) {
   
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization, ngrok-skip-browser-warning', // Include ngrok-skip-browser-warning
  exposedHeaders: ['Content-Disposition'],
};


app.use(cors(corsOptions));


app.get('/', (req, res) => {
  res.send('Hello world');
});


app.use('/api/v1', propertyRouter);
app.use('/api/v1', authRouter);
app.use('/api/v1', userRouter);
app.use('/api/v1', leadsRouter);
app.use('/api/v1',localityRouter);
app.use('/api/v1',builderRouter);

// Start server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});