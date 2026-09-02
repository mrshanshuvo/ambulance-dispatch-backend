import app from "./app";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT ?? 5000;

app.listen(PORT, () => {
  console.log(`🚑 Emergency Dispatch API running on port ${PORT}`);
});
