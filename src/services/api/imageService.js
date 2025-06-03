import imagesData from '../mockData/images.json'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

let images = [...imagesData]

const imageService = {
  async getAll() {
    await delay(250)
    return [...images]
  },

  async getById(id) {
    await delay(200)
    const image = images.find(img => img.id === id)
    if (!image) {
      throw new Error('Image not found')
    }
    return { ...image }
  },

  async create(imageData) {
    await delay(500)
    const newImage = {
      ...imageData,
      id: Date.now().toString(),
      uploadedAt: new Date().toISOString()
    }
    images.push(newImage)
    return { ...newImage }
  },

  async update(id, updates) {
    await delay(300)
    const index = images.findIndex(img => img.id === id)
    if (index === -1) {
      throw new Error('Image not found')
    }
    images[index] = { ...images[index], ...updates, updatedAt: new Date().toISOString() }
    return { ...images[index] }
  },

  async delete(id) {
    await delay(250)
    const index = images.findIndex(img => img.id === id)
    if (index === -1) {
      throw new Error('Image not found')
    }
    const deletedImage = images.splice(index, 1)[0]
    return { ...deletedImage }
  },

  async validateImage(file) {
    await delay(100)
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.')
    }
    
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 10MB.')
    }
    
    return true
  }
}

export default imageService