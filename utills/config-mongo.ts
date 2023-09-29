import { MongoClient } from "mongodb";

export const configMongodb = async() => {
    const client = new MongoClient(process.env.MONGODB_ATLAS_URI || "");
    await client.connect();
    const collection = client.db("chatbot").collection("messages");

    return collection
}