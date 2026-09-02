import app from "./app";
import { envConfig } from "./config/env";

const PORT = envConfig.port;

app.listen(PORT, () => {
  console.log(
    `🚑 Emergency Dispatch API running on port ${PORT} in ${envConfig.env} mode`,
  );
});
