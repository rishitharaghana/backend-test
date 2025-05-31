const express = require('express');
const cors = require('cors');

const careerRouter = require('./routes/careerRoutes');
const adsRouter = require('./routes/adsRoutes');
const employeeRouter = require('./routes/employeeRoutes');

const app = express();

app.use(express.json());
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders:
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  exposedHeaders: ["Content-Disposition"],
};

app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders:
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    credentials: true,
  })
);

app.get('/',(req,res)=>{
    res.send('Hello world');
});

app.use("/api/v1",careerRouter);
app.use("/api/v1",adsRouter);
app.use("/api/v1",employeeRouter);

const port = 3000;

app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
});
