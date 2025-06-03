import compositeImagesData from '../mockData/compositeImages.json'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

let compositeImages = [...compositeImagesData]

const compositeImageService = {
  async getAll() {
    await delay(300)
    return [...compositeImages]
  },

  async getById(id) {
    await delay(200)
    const composite = compositeImages.find(comp => comp.id === id)
    if (!composite) {
      throw new Error('Composite image not found')
    }
    return { ...composite }
  },

  async create(compositeData) {
    await delay(600)
    const newComposite = {
      ...compositeData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }
    compositeImages.push(newComposite)
    return { ...newComposite }
  },

  async update(id, updates) {
    await delay(400)
    const index = compositeImages.findIndex(comp => comp.id === id)
    if (index === -1) {
      throw new Error('Composite image not found')
    }
    compositeImages[index] = { ...compositeImages[index], ...updates, updatedAt: new Date().toISOString() }
    return { ...compositeImages[index] }
  },

  async delete(id) {
    await delay(250)
    const index = compositeImages.findIndex(comp => comp.id === id)
    if (index === -1) {
      throw new Error('Composite image not found')
    }
    const deletedComposite = compositeImages.splice(index, 1)[0]
    return { ...deletedComposite }
  },

  async generateComposite(foregroundImage, background, adjustments) {
    await delay(800)
    // In a real implementation, this would process the images
    // For now, we return mock data
    const composite = {
      id: Date.now().toString(),
      foregroundImage,
      background,
      adjustments,
      processedUrl: foregroundImage.url, // Mock processed URL
      createdAt: new Date().toISOString()
    }
    
    compositeImages.push(composite)
    return { ...composite }
  },

  async exportComposite(id, format = 'png') {
    await delay(400)
    const composite = compositeImages.find(comp => comp.id === id)
    if (!composite) {
      throw new Error('Composite image not found')
    }
    
    // Mock export process
    return {
      downloadUrl: composite.processedUrl,
      format,
      filename: `backdropify-${id}.${format}`,
      size: Math.floor(Math.random() * 1000000) + 500000 // Mock file size
    }
  }
}

export default compositeImageService