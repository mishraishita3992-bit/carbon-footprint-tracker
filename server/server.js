const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Carbon Footprint Tracker API is running!"
  });
});


// Carbon calculation route
app.post("/api/calculate", (req, res) => {

  const { type, amount } = req.body;

  let emissions = 0;

  if (type === "Transport") {
    emissions = amount * 0.21;
  }

  if (type === "Food") {
    emissions = amount * 2.5;
  }

  if (type === "Energy") {
    emissions = amount * 0.7;
  }

  res.json({
    type: type,
    amount: amount,
    emissions: emissions
  });

});


const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});