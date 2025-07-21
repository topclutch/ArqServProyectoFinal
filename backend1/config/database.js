import mongoose from 'mongoose'

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/soa_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    
    console.log(`📚 MongoDB conectado: ${conn.connection.host}`)
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message)
    process.exit(1)
  }
}

export default connectDB