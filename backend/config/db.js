import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Allow either a generic MONGO_URI or a dedicated MONGO_ATLAS_URI
    // Priority: MONGO_ATLAS_URI > MONGO_URI
    let uri = process.env.MONGO_ATLAS_URI || process.env.MONGO_URI;

    // Optional builder: if MONGO_ATLAS_USER / PASS / CLUSTER / DB_NAME are provided, build the URI
    if (
      !uri &&
      process.env.MONGO_ATLAS_USER &&
      process.env.MONGO_ATLAS_PASSWORD &&
      process.env.MONGO_ATLAS_CLUSTER
    ) {
      const user = encodeURIComponent(process.env.MONGO_ATLAS_USER);
      const pass = encodeURIComponent(process.env.MONGO_ATLAS_PASSWORD);
      const cluster = process.env.MONGO_ATLAS_CLUSTER; // e.g. cluster0.mongodb.net
      const dbName = process.env.MONGO_ATLAS_DB || "halal-ecommerce";
      uri = `mongodb+srv://${user}:${pass}@${cluster}/${dbName}?retryWrites=true&w=majority`;
    }

    if (!uri) {
      throw new Error(
        "No MongoDB connection string provided. Set MONGO_ATLAS_URI or MONGO_URI or atlas credential vars.",
      );
    }

    // Use recommended options for Mongoose 9+; explicit options are no longer needed.
    const conn = await mongoose.connect(uri);

    const dbName = conn.connection.name;
    console.log(`MongoDB Connected: ${conn.connection.host} (${dbName})`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
