const express = require('express');
const cors = require('cors');


const propertyRouter = require('./routes/propertyRoutes');
const userRouter = require('./routes/userRoutes');
const authRouter = require('./routes/authRoutes');
const leadsRouter = require('./routes/leadsRoutes')

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


app.use("/api/v1",propertyRouter);
app.use("/api/v1",authRouter);
app.use("/api/v1",userRouter);
app.use("/api/v1",leadsRouter);


const port = 3000;

app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
});
