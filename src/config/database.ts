import mongoose from "mongoose";

export async function connectDatabase(uri: string) {
  await mongoose.connect(uri);
}
