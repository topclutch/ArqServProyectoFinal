import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 2, maxlength: 50, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true,
           match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido'] },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['Administrador', 'Vendedor', 'Consultor'], default: 'Vendedor' },
  active: { type: Boolean, default: true }
}, { timestamps: true })

// Hash antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// Método para comparar contraseña
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Ocultar password en JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject()
  delete obj.password
  return obj
}

export default mongoose.model('User', userSchema)
