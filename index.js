const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://expense-tracker-client-delta.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2wbpdjd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const dbName = "expenseTracker";
const expenseCollectionName = "expenses";
let expenseCollection;

async function run() {
  try {
    await client.connect();
    const database = client.db(dbName);
    expenseCollection = database.collection(expenseCollectionName);
    console.log("Connected to MongoDB database");

    // Expense routes
    app.post("/expenses", async (req, res) => {
      try {
        // Input validation
        if (!req.body.title || req.body.title.length < 3) {
          return res.status(400).json({
            error: "Title is required and must be at least 3 characters",
          });
        }
        if (!req.body.amount || isNaN(req.body.amount)) {
          return res
            .status(400)
            .json({ error: "Amount is required and must be a number" });
        }
        if (!req.body.date || isNaN(Date.parse(req.body.date))) {
          return res.status(400).json({ error: "Valid date is required" });
        }

        const expense = {
          title: req.body.title,
          amount: parseFloat(req.body.amount),
          category: req.body.category || "Others",
          date: new Date(req.body.date),
          createdAt: new Date(),
        };

        const result = await expenseCollection.insertOne(expense);
        res.status(201).json({ ...expense, _id: result.insertedId });
      } catch (error) {
        console.error("Error creating expense:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Get all expenses
    app.get("/expenses", async (req, res) => {
      try {
        const expenses = await expenseCollection.find().toArray();
        res.json(expenses);
      } catch (error) {
        console.error("Error fetching expenses:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Update expense
    app.patch("/expenses/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = {};

        if (req.body.title) {
          if (req.body.title.length < 3) {
            return res
              .status(400)
              .json({ error: "Title must be at least 3 characters" });
          }
          updateData.title = req.body.title;
        }

        if (req.body.amount) {
          if (isNaN(req.body.amount)) {
            return res.status(400).json({ error: "Amount must be a number" });
          }
          updateData.amount = parseFloat(req.body.amount);
        }

        if (req.body.category) {
          updateData.category = req.body.category;
        }

        if (req.body.date) {
          if (isNaN(Date.parse(req.body.date))) {
            return res.status(400).json({ error: "Valid date is required" });
          }
          updateData.date = new Date(req.body.date);
        }

        const result = await expenseCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Expense not found" });
        }

        res.json({ message: "Expense updated successfully" });
      } catch (error) {
        console.error("Error updating expense:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Delete expense
    app.delete("/expenses/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await expenseCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "Expense not found" });
        }

        res.json({ message: "Expense deleted successfully" });
      } catch (error) {
        console.error("Error deleting expense:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Expense Tracker API is running");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Close MongoDB connection when app stops
process.on("SIGINT", async () => {
  await client.close();
  process.exit();
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
